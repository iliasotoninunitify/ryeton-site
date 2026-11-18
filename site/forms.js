// Sends the contact forms to our own handler on Cloudflare (forms.ryeton.com).
(function () {
  var ENDPOINT = "https://forms.ryeton.com";
  var started = Date.now();
  var forms = document.querySelectorAll("form.lead-form");
  Array.prototype.forEach.call(forms, function (form) {
    var status = form.querySelector(".form-status");
    var button = form.querySelector("button[type=submit]");
    var label = button.textContent;
    function say(text, isError) {
      status.textContent = text;
      status.classList.toggle("err", !!isError);
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.elements.name, email = form.elements.email;
      name.removeAttribute("aria-invalid"); email.removeAttribute("aria-invalid");
      if (!name.value.trim()) { name.setAttribute("aria-invalid", "true"); name.focus(); say("Please add your name.", true); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { email.setAttribute("aria-invalid", "true"); email.focus(); say("Please check your email address.", true); return; }
      var data = { kind: form.getAttribute("data-kind"), started: started };
      Array.prototype.forEach.call(form.elements, function (el) { if (el.name) data[el.name] = el.value; });
      button.disabled = true; button.setAttribute("aria-busy", "true"); button.textContent = "Sending…"; say("");
      fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error("send");
          form.reset();
          button.textContent = "Sent";
          say("Thank you. We will reply within one business day.");
        })
        .catch(function () {
          button.disabled = false; button.textContent = label;
          say("That did not go through. Please try again, or write to hello@ryeton.com.", true);
        })
        .finally(function () { button.removeAttribute("aria-busy"); });
    });
  });
})();
