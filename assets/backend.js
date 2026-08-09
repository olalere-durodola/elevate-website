/* ============================================================
   backend.js — everything that talks to Supabase.

   Nothing else in the site knows Supabase exists. If you ever
   swap databases, this is the only file that changes.

   Uses plain fetch against Supabase's REST and auth endpoints,
   so there is no SDK to load, version, or keep up to date.
   ============================================================ */

var Backend = (function () {
  var cfg = window.CONFIG || {};
  var URL_BASE = (cfg.SUPABASE_URL || "").replace(/\/+$/, "");
  var ANON = cfg.SUPABASE_ANON_KEY || "";
  var CONFIGURED = !!(URL_BASE && ANON);

  var TOKEN_KEY = "elevate.session";
  var session = null;

  /* ---------- session storage ---------- */

  function loadSession() {
    try {
      var raw = localStorage.getItem(TOKEN_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.access_token) return null;
      return s;
    } catch (e) {
      return null;
    }
  }

  function storeSession(s) {
    session = s;
    try {
      if (s) localStorage.setItem(TOKEN_KEY, JSON.stringify(s));
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* private browsing — session lasts this tab only */ }
  }

  function expired(s) {
    return !s || !s.expires_at || s.expires_at - 60 <= Math.floor(Date.now() / 1000);
  }

  function stamp(s) {
    if (s && s.expires_in && !s.expires_at) {
      s.expires_at = Math.floor(Date.now() / 1000) + Number(s.expires_in);
    }
    return s;
  }

  /* ---------- low-level request ---------- */

  function authHeaders(token) {
    return {
      "apikey": ANON,
      "Authorization": "Bearer " + (token || ANON),
      "Content-Type": "application/json"
    };
  }

  function request(path, opts) {
    opts = opts || {};
    return fetch(URL_BASE + path, {
      method: opts.method || "GET",
      headers: Object.assign(authHeaders(opts.token), opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        if (text) { try { data = JSON.parse(text); } catch (e) { data = text; } }
        if (!res.ok) {
          var msg = (data && (data.message || data.error_description || data.error || data.msg)) ||
                    ("Request failed (" + res.status + ")");
          var err = new Error(msg);
          err.status = res.status;
          err.body = data;
          throw err;
        }
        return data;
      });
    });
  }

  /* Refresh the access token if it is close to expiring, then run fn
     with a valid token. Any 401 clears the session so the console can
     ask the coach to sign in again rather than silently failing. */
  function withAuth(fn) {
    if (!session) session = loadSession();
    if (!session) return Promise.reject(new Error("Not signed in"));
    var ready = expired(session)
      ? request("/auth/v1/token?grant_type=refresh_token", {
          method: "POST", body: { refresh_token: session.refresh_token }
        }).then(function (s) { storeSession(stamp(s)); return s; })
      : Promise.resolve(session);

    return ready.then(function (s) {
      return fn(s.access_token);
    }).catch(function (err) {
      if (err.status === 401 || err.status === 403) storeSession(null);
      throw err;
    });
  }

  /* ---------- auth ---------- */

  function redirectTarget() {
    if (cfg.REDIRECT_URL) return cfg.REDIRECT_URL;
    return location.origin + location.pathname + "?edit";
  }

  /* Sends a one-time sign-in link. create_user:false means only people
     you have already invited in the Supabase dashboard can get in —
     a stranger who guesses the URL gets nothing. */
  function sendLoginLink(email) {
    return request("/auth/v1/otp?redirect_to=" + encodeURIComponent(redirectTarget()), {
      method: "POST",
      body: { email: email, create_user: false, gotrue_meta_security: {} }
    });
  }

  /* Supabase returns tokens in the URL fragment after the coach clicks
     their email link. Pull them in, then scrub the address bar so the
     tokens don't sit in history or get pasted into a group chat. */
  function captureRedirect() {
    if (!location.hash || location.hash.indexOf("access_token") === -1) return false;
    var params = new URLSearchParams(location.hash.slice(1));
    var access = params.get("access_token");
    if (!access) return false;
    storeSession(stamp({
      access_token: access,
      refresh_token: params.get("refresh_token"),
      expires_in: params.get("expires_in")
    }));
    history.replaceState(null, "", location.pathname + location.search);
    return true;
  }

  function authError() {
    if (!location.hash || location.hash.indexOf("error") === -1) return null;
    var params = new URLSearchParams(location.hash.slice(1));
    var desc = params.get("error_description") || params.get("error");
    if (desc) history.replaceState(null, "", location.pathname + location.search);
    return desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : null;
  }

  function currentUser() {
    return withAuth(function (token) {
      return request("/auth/v1/user", { token: token });
    });
  }

  function signOut() {
    var s = session || loadSession();
    storeSession(null);
    if (!s) return Promise.resolve();
    return request("/auth/v1/logout", { method: "POST", token: s.access_token })
      .catch(function () { /* token already dead server-side; nothing to do */ });
  }

  function signedIn() {
    if (!session) session = loadSession();
    return !!session;
  }

  /* ---------- content ---------- */

  function loadContent() {
    return Promise.all([
      request("/rest/v1/teams?select=id,position,data,updated_at&order=position.asc"),
      request("/rest/v1/site?select=data,updated_at&id=eq.main")
    ]).then(function (out) {
      var rows = out[0] || [];
      var siteRow = (out[1] || [])[0];
      return {
        teams: rows.map(function (r) {
          var t = Object.assign({}, r.data, { id: r.id });
          t._updatedAt = r.updated_at;
          return t;
        }),
        site: siteRow ? siteRow.data : null,
        siteUpdatedAt: siteRow ? siteRow.updated_at : null
      };
    });
  }

  /* Strips the bookkeeping fields the site adds at runtime so they
     never get written back into the database. */
  function clean(team) {
    var copy = Object.assign({}, team);
    delete copy.id;
    delete copy._updatedAt;
    return copy;
  }

  function saveTeams(teams, removedIds) {
    return withAuth(function (token) {
      var rows = teams.map(function (t, i) {
        return { id: t.id, position: i, data: clean(t), updated_at: new Date().toISOString() };
      });
      var work = request("/rest/v1/teams", {
        method: "POST",
        token: token,
        body: rows,
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" }
      });
      if (removedIds && removedIds.length) {
        var list = removedIds.map(encodeURIComponent).join(",");
        work = work.then(function (r) {
          return request("/rest/v1/teams?id=in.(" + list + ")", { method: "DELETE", token: token })
            .then(function () { return r; });
        });
      }
      return work;
    });
  }

  function saveSite(site) {
    return withAuth(function (token) {
      return request("/rest/v1/site", {
        method: "POST",
        token: token,
        body: [{ id: "main", data: site, updated_at: new Date().toISOString() }],
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" }
      });
    });
  }

  /* Answers "has anyone else saved since I opened the console?" so two
     coaches editing on the same Saturday don't quietly overwrite one
     another. Returns the ids that changed underneath us. */
  function staleTeams(known) {
    return request("/rest/v1/teams?select=id,updated_at").then(function (rows) {
      var mine = {};
      known.forEach(function (t) { mine[t.id] = t._updatedAt || null; });
      return (rows || []).filter(function (r) {
        return (r.id in mine) && mine[r.id] && r.updated_at && r.updated_at > mine[r.id];
      }).map(function (r) { return r.id; });
    });
  }

  /* ---------- leads ---------- */

  function submitLead(payload) {
    return request("/rest/v1/leads", {
      method: "POST",
      body: [payload],
      headers: { "Prefer": "return=minimal" }
    });
  }

  function loadLeads() {
    return withAuth(function (token) {
      return request("/rest/v1/leads?select=*&order=created_at.desc&limit=100", { token: token });
    });
  }

  function markLeadHandled(id, handled) {
    return withAuth(function (token) {
      return request("/rest/v1/leads?id=eq." + encodeURIComponent(id), {
        method: "PATCH",
        token: token,
        body: { handled: handled },
        headers: { "Prefer": "return=minimal" }
      });
    });
  }

  return {
    configured: CONFIGURED,
    signedIn: signedIn,
    sendLoginLink: sendLoginLink,
    captureRedirect: captureRedirect,
    authError: authError,
    currentUser: currentUser,
    signOut: signOut,
    loadContent: loadContent,
    saveTeams: saveTeams,
    saveSite: saveSite,
    staleTeams: staleTeams,
    submitLead: submitLead,
    loadLeads: loadLeads,
    markLeadHandled: markLeadHandled
  };
})();
