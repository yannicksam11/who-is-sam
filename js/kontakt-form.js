document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('kontakt-form');
  if (!form) return;

  const TRANSLOADIT_AUTH_KEY = '2c1faba03bf980ea9352cee04ff9971f';

  const UPLOADERS = [
    {
      dropzoneId: 'upload-3d',
      statusId: 'upload-3d-status',
      hiddenInputId: 'f-3d-url',
      allowedFileTypes: ['.stl', '.obj', '.stp', '.step', '.svg', '.amf', '.gltf', '.glb', '.fbx'],
      note: 'STL, OBJ, STP, STEP, SVG, AMF, GLTF, GLB, FBX'
    },
    {
      dropzoneId: 'upload-foto',
      statusId: 'upload-foto-status',
      hiddenInputId: 'f-foto-url',
      allowedFileTypes: ['image/*'],
      note: 'JPG, PNG, HEIC, WEBP …'
    }
  ];

  function fieldOf(el) {
    return el.closest('.form-field');
  }

  function setFieldError(el, message) {
    const field = fieldOf(el);
    if (!field) return;
    field.classList.add('form-field--invalid');
    const err = field.querySelector('.form-field__error');
    if (err) err.textContent = message;
  }

  function clearFieldError(el) {
    const field = fieldOf(el);
    if (!field) return;
    field.classList.remove('form-field--invalid');
    const err = field.querySelector('.form-field__error');
    if (err) err.textContent = '';
  }

  // ── Uppy + Transloadit dropzones ──

  if (window.Uppy) {
    UPLOADERS.forEach((cfg) => {
      const target = document.getElementById(cfg.dropzoneId);
      const status = document.getElementById(cfg.statusId);
      const hiddenInput = document.getElementById(cfg.hiddenInputId);
      if (!target || !status || !hiddenInput) return;

      const uppy = new window.Uppy.Uppy({
        restrictions: {
          maxNumberOfFiles: 1,
          allowedFileTypes: cfg.allowedFileTypes
        },
        autoProceed: true,
        locale: {
          strings: {
            dropHereOr: 'Datei hierher ziehen oder %{browse}',
            browse: 'klicken'
          }
        }
      })
        .use(window.Uppy.DragDrop, { target, note: cfg.note })
        .use(window.Uppy.Transloadit, {
          waitForEncoding: true,
          assemblyOptions: {
            params: {
              auth: { key: TRANSLOADIT_AUTH_KEY },
              steps: {
                store: { robot: '/file/store', use: ':original' }
              }
            }
          }
        });

      uppy.on('file-added', (file) => {
        hiddenInput.value = '';
        status.hidden = false;
        status.classList.remove('upload-status--done', 'upload-status--error');
        status.textContent = `${file.name} – wird hochgeladen …`;
      });

      uppy.on('upload-progress', (file, progress) => {
        if (!file || !progress.bytesTotal) return;
        const pct = Math.round((progress.bytesUploaded / progress.bytesTotal) * 100);
        status.textContent = `${file.name} – wird hochgeladen … ${pct}%`;
      });

      uppy.on('transloadit:complete', (assembly) => {
        const results = assembly.results && assembly.results.store;
        const url = results && results[0] && results[0].ssl_url;
        if (url) {
          hiddenInput.value = url;
          status.classList.add('upload-status--done');
          status.textContent = '✓ Datei hochgeladen';
          clearFieldError(hiddenInput);
        }
      });

      uppy.on('upload-error', () => {
        status.classList.add('upload-status--error');
        status.textContent = 'Fehler beim Hochladen. Bitte erneut versuchen.';
      });

      uppy.on('restriction-failed', (file, error) => {
        status.hidden = false;
        status.classList.add('upload-status--error');
        status.textContent = error.message;
      });
    });
  }

  // ── Validation ──

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateForm() {
    let valid = true;

    form.querySelectorAll('.form-field').forEach((field) => field.classList.remove('form-field--invalid'));
    form.querySelectorAll('.form-field__error').forEach((err) => { err.textContent = ''; });

    form.querySelectorAll('[required]').forEach((el) => {
      if (el.type === 'radio') {
        const checked = form.querySelector(`input[name="${el.name}"]:checked`);
        if (!checked) {
          setFieldError(el, 'Bitte auswählen.');
          valid = false;
        }
        return;
      }
      if (!el.value || !el.value.trim()) {
        setFieldError(el, el.type === 'hidden' ? 'Bitte Datei hochladen.' : 'Pflichtfeld.');
        valid = false;
      }
    });

    const email = document.getElementById('f-email');
    if (email && email.value.trim() && !EMAIL_RE.test(email.value.trim())) {
      setFieldError(email, 'Bitte gültige E-Mail-Adresse eingeben.');
      valid = false;
    }

    return valid;
  }

  // ── Submission (Netlify Forms via AJAX) ──

  function encodeFormData(formEl) {
    return new URLSearchParams(new FormData(formEl)).toString();
  }

  function fireConfetti(btn) {
    if (typeof window.confetti !== 'function') return;
    const rect = btn.getBoundingClientRect();
    const origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight
    };
    window.confetti({
      particleCount: 140,
      spread: 80,
      startVelocity: 40,
      gravity: 1.1,
      ticks: 220,
      origin,
      colors: ['#000000', '#4d4d4d', '#999999'],
      zIndex: 200
    });
  }

  function handleSuccess(submitBtn) {
    Array.from(form.elements).forEach((el) => { el.disabled = true; });
    submitBtn.disabled = true;
    submitBtn.textContent = 'Vielen Dank für die Anfrage!';
    document.getElementById('form-success').hidden = false;
    fireConfetti(submitBtn);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const generalError = document.getElementById('form-error');
    generalError.hidden = true;

    if (!validateForm()) {
      generalError.hidden = false;
      generalError.textContent = 'Bitte fülle alle Pflichtfelder korrekt aus.';
      return;
    }

    const submitBtn = form.querySelector('.panel-kontakt__submit-btn');
    const defaultLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird gesendet …';

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encodeFormData(form)
    })
      .then((response) => {
        if (!response.ok) throw new Error('submit failed');
        handleSuccess(submitBtn);
      })
      .catch(() => {
        generalError.hidden = false;
        generalError.textContent = 'Etwas ist schiefgelaufen. Bitte versuche es erneut oder schreib mir direkt eine E-Mail.';
        submitBtn.disabled = false;
        submitBtn.textContent = defaultLabel;
      });
  });
});
