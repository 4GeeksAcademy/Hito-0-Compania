const form = document.getElementById("application-form");

if (form) {
  const MESSAGES = {
    es: {
      fullName: "Ingresa tu nombre completo (minimo 3 caracteres).",
      company: "Indica el nombre de tu empresa.",
      email: "Introduce un email corporativo valido.",
      phone: "Introduce un telefono valido (minimo 7 digitos).",
      details: "Comparte observaciones de la operacion (minimo 10 caracteres).",
      formError: "Revisa los campos marcados antes de solicitar la asesoria.",
      formSuccess: "Solicitud enviada correctamente. Nuestro equipo te contactara pronto."
    },
    en: {
      fullName: "Enter your full name (minimum 3 characters).",
      company: "Enter your company name.",
      email: "Enter a valid corporate email.",
      phone: "Enter a valid phone number (minimum 7 digits).",
      details: "Share operational notes (minimum 10 characters).",
      formError: "Please review the highlighted fields before requesting consulting.",
      formSuccess: "Request sent successfully. Our team will contact you soon."
    }
  };

  const getCurrentLanguage = () => {
    const htmlLang = (document.documentElement.lang || "").toLowerCase();
    return htmlLang === "en" ? "en" : "es";
  };

  const statusElement = document.getElementById("form-status");

  const setFieldError = (fieldId, message) => {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}-error`);

    if (!field || !errorElement) return;

    errorElement.textContent = message;

    if (message) {
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", `${fieldId}-error`);
      field.classList.add("border-red-500", "ring-2", "ring-red-200");
    } else {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
      field.classList.remove("border-red-500", "ring-2", "ring-red-200");
    }
  };

  const setGroupError = (groupId, message) => {
    const errorElement = document.getElementById(`${groupId}-error`);
    if (!errorElement) return;

    errorElement.textContent = message;
  };

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  const isValidPhone = (value) => /^\+?[0-9\s().-]{7,}$/.test(value);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const lang = getCurrentLanguage();
    const t = MESSAGES[lang];

    if (statusElement) {
      statusElement.textContent = "";
      statusElement.className = "min-h-6 text-sm font-semibold";
    }

    let hasErrors = false;

    const getTrimmed = (id) => {
      const element = document.getElementById(id);
      return element ? element.value.trim() : "";
    };

    const fullName = getTrimmed("fullName");
    if (!fullName || fullName.length < 3) {
      setFieldError("fullName", t.fullName);
      hasErrors = true;
    } else {
      setFieldError("fullName", "");
    }

    const company = getTrimmed("company");
    if (!company || company.length < 2) {
      setFieldError("company", t.company);
      hasErrors = true;
    } else {
      setFieldError("company", "");
    }

    const email = getTrimmed("email");
    if (!email || !isValidEmail(email)) {
      setFieldError("email", t.email);
      hasErrors = true;
    } else {
      setFieldError("email", "");
    }

    const phone = getTrimmed("phone");
    if (phone && !isValidPhone(phone)) {
      setFieldError("phone", t.phone);
      hasErrors = true;
    } else {
      setFieldError("phone", "");
    }

    setGroupError("services", "");

    const details = getTrimmed("details");
    if (details && details.length < 10) {
      setFieldError("details", t.details);
      hasErrors = true;
    } else {
      setFieldError("details", "");
    }

    if (hasErrors) {
      if (statusElement) {
        statusElement.textContent = t.formError;
        statusElement.classList.add("text-red-700");
      }

      const firstErrorField = form.querySelector("[aria-invalid='true']");
      if (firstErrorField) {
        firstErrorField.focus();
      }
      return;
    }

    if (statusElement) {
      statusElement.textContent = t.formSuccess;
      statusElement.classList.add("text-green-700");
    }

    form.reset();
  });
}
