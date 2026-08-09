/* ============================================================
   form.js — the tryout request form.

   Submissions go into the leads table and show up in the edit
   console under Requests. If the database is unreachable the
   parent is told plainly, rather than being shown a thank-you
   for a message that went nowhere.
   ============================================================ */

(function () {
  var EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

  function el(id) { return document.getElementById(id); }

  /* The visual state and the programmatic state have to move together, or a
     screen-reader user gets a form that looks wrong and sounds fine. */
  function flag(id, bad) {
    var field = el("f-" + id), msg = el("m-" + id);
    if (field) {
      field.classList.toggle("bad", bad);
      field.setAttribute("aria-invalid", bad ? "true" : "false");
      if (bad) field.setAttribute("aria-describedby", "m-" + id);
      else field.removeAttribute("aria-describedby");
    }
    if (msg) msg.classList.toggle("show", bad);
    return !bad;
  }

  function digitCount(s) { return s.replace(/\D/g, "").length; }

  function setBusy(busy, label) {
    var button = el("f-send"), note = el("f-note");
    if (button) {
      button.disabled = busy;
      button.textContent = busy ? "Sending…" : "Send request";
      button.style.opacity = busy ? "0.6" : "";
    }
    if (note && label) note.textContent = label;
  }

  function submit() {
    /* Honeypot: real people never fill this in, bots usually do. */
    if (el("f-trap").value) return;

    var phone = el("f-phone").value.trim();
    var reason = el("f-reason").value;

    var valid = [
      flag("name", el("f-name").value.trim().length < 2),
      flag("email", !EMAIL.test(el("f-email").value.trim())),
      flag("reason", !reason),
      flag("phone", phone !== "" && (digitCount(phone) < 10 || digitCount(phone) > 15))
    ].every(Boolean);

    var consented = el("f-consent").checked;
    el("m-consent").style.display = consented ? "none" : "inline";

    if (!valid || !consented) {
      var problems = document.querySelectorAll(".field .msg.show").length + (consented ? 0 : 1);
      Site.announce(problems === 1
        ? "One field needs attention."
        : problems + " fields need attention.");
      var firstBad = document.querySelector(".field input.bad,.field select.bad");
      if (firstBad) firstBad.focus();
      else if (!consented) el("f-consent").focus();
      return;
    }

    var viewing = Site.state.teams[Site.state.current];
    var payload = {
      name: el("f-name").value.trim(),
      email: el("f-email").value.trim(),
      phone: phone,
      reason: reason,
      player: el("f-player").value.trim(),
      grade: el("f-grade").value,
      message: el("f-msg").value.trim(),
      team_viewing: viewing ? viewing.name : null
    };

    if (!Backend.configured) {
      console.warn("No database connected yet — this request was not saved. See SETUP.md.", payload);
      showSent();
      return;
    }

    setBusy(true);
    Backend.submitLead(payload).then(function () {
      showSent();
    }).catch(function (err) {
      console.error("Lead submission failed", err);
      setBusy(false, "Could not send. Check your connection and try again.");
      var note = el("f-note");
      if (note) note.style.color = "var(--ion)";
    });
  }

  /* Focus moves to the confirmation and it is announced. Previously the form
     vanished, a panel appeared, and a screen-reader user heard nothing. */
  function showSent() {
    el("formwrap").style.display = "none";
    var sent = el("sent");
    sent.classList.add("show");
    sent.scrollIntoView({ block: "center" });
    sent.focus();
    Site.announce("Request sent. " + (el("sentBody") ? el("sentBody").textContent : ""));
  }

  var form = el("joinForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();     /* Enter in any field now submits, as it should */
      submit();
    });
  }

  ["name", "email", "phone", "reason"].forEach(function (key) {
    var field = el("f-" + key);
    if (field) field.addEventListener("input", function () { flag(key, false); });
  });

  el("f-reason").addEventListener("change", function () {
    var sponsoring = this.value === "Sponsor the program";
    el("wrap-player").style.display = sponsoring ? "none" : "flex";
    el("wrap-grade").style.display = sponsoring ? "none" : "flex";
  });
})();
