/* ============================================================
   config.js — the only file you need to edit by hand.

   Paste the two values from your Supabase project here.
   Find them at: Supabase dashboard → Project Settings → API

   Until you fill these in, the site runs fine on the content in
   seed.js. Coaches just can't sign in or save anything yet.
   Full walkthrough is in SETUP.md.

   The anon key is safe to publish. It is designed to sit in a
   public web page, and the database rules decide what it can
   actually do — read everything, change nothing.
   ============================================================ */

window.CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  /* Where a coach lands after clicking their sign-in email.
     Leave as "" to use whatever address the page is served from,
     which is what you want almost always. */
  REDIRECT_URL: ""
};
