/* Ayesha Travel — site behaviour (no dependencies).
   Content lives in site-config.js; this file only renders and wires it up. */
(function () {
  'use strict';

  var doc = document.documentElement;
  doc.classList.add('js');

  var SITE = window.AYESHA_SITE || { contact: {}, destinations: [] };
  var CONTACT = SITE.contact || {};
  var DESTINATIONS = Array.isArray(SITE.destinations) ? SITE.destinations : [];
  var STORAGE_KEY = 'ayesha-travel-trip';
  var ENDPOINT = '/api/enquiry';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value == null || value === false) return;
        if (key === 'text') node.textContent = value;
        else if (key === 'html') node.innerHTML = value; // only used with trusted, static icon markup
        else node.setAttribute(key, value === true ? '' : value);
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  var ICONS = {
    plus: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2.5 8.5l3.5 3.5 7.5-8" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3.5 6l8.5 7 8.5-7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3a9 9 0 00-7.8 13.5L3 21l4.6-1.2A9 9 0 1012 3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1-.4-2.4-1.8-2.8-2.8l.8-1-1-2L9 8.5z" fill="currentColor"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5V21" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 3v11.5a3.5 3.5 0 11-3.5-3.5M14 3c.4 2.6 2.2 4.4 5 4.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /* --------------------------------------------------------------------
     Safe URL helpers — only render links that are well formed.
     -------------------------------------------------------------------- */
  function validEmail(value) {
    return typeof value === 'string' && /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/.test(value.trim());
  }
  function whatsappUrl(value) {
    var digits = String(value || '').replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15 ? 'https://wa.me/' + digits : '';
  }
  function httpsUrl(value) {
    try {
      var url = new URL(String(value || '').trim());
      return url.protocol === 'https:' ? url.href : '';
    } catch (e) {
      return '';
    }
  }

  /* --------------------------------------------------------------------
     Header: mobile navigation, scrolled state, current section
     -------------------------------------------------------------------- */
  function initNav() {
    var header = $('[data-header]');
    var toggle = $('[data-nav-toggle]');
    var nav = $('[data-nav]');
    if (!toggle || !nav) return;
    var mq = window.matchMedia('(max-width: 860px)');

    function setOpen(open, returnFocus) {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      $('.nav-toggle-label', toggle).textContent = open ? 'Close' : 'Menu';
      if (open) {
        var first = $('a', nav);
        if (first) first.focus();
      } else if (returnFocus) {
        toggle.focus();
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a') && mq.matches) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
    });
    document.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') === 'true' && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    // Keep keyboard focus inside the open mobile menu.
    nav.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !mq.matches || toggle.getAttribute('aria-expanded') !== 'true') return;
      var items = [toggle].concat($$('a', nav));
      var idx = items.indexOf(document.activeElement);
      if (e.shiftKey && idx === 1) { e.preventDefault(); toggle.focus(); }
      else if (!e.shiftKey && idx === items.length - 1) { e.preventDefault(); toggle.focus(); }
    });
    toggle.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && !e.shiftKey && toggle.getAttribute('aria-expanded') === 'true') {
        var first = $('a', nav);
        if (first) { e.preventDefault(); first.focus(); }
      }
    });
    var onChange = function () { if (!mq.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else mq.addListener(onChange);

    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if ('IntersectionObserver' in window) {
      var links = $$('.nav-list a');
      var map = {};
      links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var link = map[entry.target.id];
          if (!link) return;
          if (entry.isIntersecting) {
            links.forEach(function (l) { l.removeAttribute('aria-current'); });
            link.setAttribute('aria-current', 'true');
          } else if (link.getAttribute('aria-current')) {
            link.removeAttribute('aria-current');
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(map).forEach(function (id) {
        var section = document.getElementById(id);
        if (section) observer.observe(section);
      });
    }
  }

  /* --------------------------------------------------------------------
     Destinations: cards + form options
     -------------------------------------------------------------------- */
  function imgSet(base, ext) {
    return [480, 800, 1200].map(function (w) {
      return 'assets/img/destinations/' + base + '-' + w + '.' + ext + ' ' + w + 'w';
    }).join(', ');
  }

  function renderDestinations() {
    var grid = $('[data-destination-grid]');
    var options = $('[data-destination-options]');
    var helpOption = $('[data-help-choose]');
    if (!grid || !options) return;

    DESTINATIONS.forEach(function (d) {
      var ratio = Number(d.imageRatio) || 4 / 3;

      var picture = el('picture', null, [
        el('source', { type: 'image/webp', srcset: imgSet(d.image, 'webp'), sizes: '(min-width: 1240px) 400px, (min-width: 760px) 50vw, 100vw' }),
        el('img', {
          src: 'assets/img/destinations/' + d.image + '-800.jpg',
          srcset: imgSet(d.image, 'jpg'),
          sizes: '(min-width: 1240px) 400px, (min-width: 760px) 50vw, 100vw',
          width: 800,
          height: Math.round(800 / ratio),
          alt: d.imageAlt || '',
          loading: 'lazy',
          decoding: 'async',
        }),
      ]);

      var button = el('button', {
        type: 'button',
        class: 'btn trip-toggle',
        'data-trip-toggle': d.id,
      });

      var card = el('li', { class: 'destination-card reveal', 'data-destination': d.id }, [
        el('div', { class: 'card-media' }, [picture]),
        el('div', { class: 'card-body' }, [
          el('p', { class: 'card-region', text: d.region }),
          el('h3', { text: d.name }),
          el('p', { class: 'card-summary', text: d.summary }),
          el('ul', { class: 'card-highlights', 'aria-label': 'Highlights in ' + d.name },
            (d.highlights || []).slice(0, 3).map(function (h) { return el('li', { text: h }); })),
          el('div', { class: 'card-actions' }, [
            button,
            d.credit ? el('p', { class: 'card-credit', text: 'Photo: ' + d.credit }) : null,
          ]),
        ]),
      ]);
      grid.appendChild(card);

      var option = el('label', { class: 'check check-dest' }, [
        el('input', { type: 'checkbox', name: 'destinations', value: d.name, 'data-destination-option': d.id }),
        el('img', { class: 'check-thumb', src: 'assets/img/destinations/' + d.image + '-480.jpg', alt: '', width: 40, height: 40, loading: 'lazy', decoding: 'async' }),
        el('span', { text: d.name }),
      ]);
      options.insertBefore(option, helpOption ? helpOption.closest('label') : null);
    });
  }

  /* --------------------------------------------------------------------
     Trip selection — the form checkboxes are the single source of truth
     -------------------------------------------------------------------- */
  var toastTimer;
  function showToast(message, withLink) {
    var toast = $('[data-toast]');
    if (!toast) return;
    $('[data-toast-text]', toast).textContent = message;
    $('[data-toast-link]', toast).hidden = !withLink;
    toast.hidden = false;
    toast.classList.remove('is-visible');
    void toast.offsetWidth;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 4500);
  }

  function destinationById(id) {
    for (var i = 0; i < DESTINATIONS.length; i++) if (DESTINATIONS[i].id === id) return DESTINATIONS[i];
    return null;
  }

  function selectedIds() {
    return $$('[data-destination-option]:checked').map(function (i) { return i.getAttribute('data-destination-option'); });
  }

  function saveTrip(ids) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch (e) { /* storage unavailable */ }
  }
  function loadTrip() {
    try {
      var ids = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(ids) ? ids : [];
    } catch (e) {
      return [];
    }
  }

  function syncTrip(options) {
    var ids = selectedIds();
    var count = ids.length;

    $$('[data-trip-toggle]').forEach(function (button) {
      var id = button.getAttribute('data-trip-toggle');
      var on = ids.indexOf(id) !== -1;
      var d = destinationById(id);
      // Visible text names the action; the destination name is added for screen readers.
      button.classList.toggle('is-on', on);
      button.innerHTML = on ? ICONS.close : ICONS.plus;
      button.appendChild(document.createTextNode(on ? 'Remove ' : 'Add '));
      button.appendChild(el('span', { class: 'visually-hidden', text: d.name + ' ' }));
      button.appendChild(document.createTextNode(on ? 'from My Trip' : 'to My Trip'));
      var card = button.closest('.destination-card');
      card.classList.toggle('is-selected', on);
      var tag = $('.card-selected-tag', card);
      if (on && !tag) {
        var media = $('.card-media', card);
        media.appendChild(el('span', { class: 'card-selected-tag', html: ICONS.check + '<span>In your trip</span>' }));
        $('svg', media.lastChild).setAttribute('width', '12');
      } else if (!on && tag) {
        tag.remove();
      }
    });

    var summary = $('[data-trip-summary]');
    if (summary) {
      summary.textContent = '';
      ids.forEach(function (id) {
        var d = destinationById(id);
        if (!d) return;
        var remove = el('button', { type: 'button', 'aria-label': 'Remove ' + d.name + ' from my trip', 'data-remove-destination': id, html: ICONS.close });
        summary.appendChild(el('span', { class: 'trip-chip' }, [el('span', { text: d.name }), remove]));
      });
    }

    var badge = $('[data-trip-count]');
    if (badge) {
      badge.hidden = count === 0;
      badge.textContent = String(count);
      badge.setAttribute('aria-label', count + (count === 1 ? ' destination' : ' destinations') + ' in your trip');
      if (options && options.bump && !reduceMotion) {
        badge.classList.remove('is-bumped');
        void badge.offsetWidth;
        badge.classList.add('is-bumped');
      }
    }

    saveTrip(ids);
  }

  function setDestination(id, on, source) {
    var input = $('[data-destination-option="' + id + '"]');
    var d = destinationById(id);
    if (!input || !d) return;
    input.checked = on;
    clearFieldError('destinations');
    syncTrip({ bump: true });
    if (source !== 'form') {
      showToast(on ? d.name + ' added to your trip' : d.name + ' removed from your trip', on);
    }
  }

  function initTrip() {
    loadTrip().forEach(function (id) {
      var input = $('[data-destination-option="' + id + '"]');
      if (input) input.checked = true;
    });

    document.addEventListener('click', function (e) {
      var toggle = e.target.closest('[data-trip-toggle]');
      if (toggle) {
        setDestination(toggle.getAttribute('data-trip-toggle'), !toggle.classList.contains('is-on'), 'card');
        return;
      }
      var remove = e.target.closest('[data-remove-destination]');
      if (remove) {
        var id = remove.getAttribute('data-remove-destination');
        // Move focus somewhere sensible before the chip disappears.
        var next = remove.closest('.trip-chip').nextElementSibling || remove.closest('.trip-chip').previousElementSibling;
        setDestination(id, false, 'chip');
        var focusTarget = next && next.querySelector('button')
          ? $('[data-remove-destination="' + next.querySelector('button').getAttribute('data-remove-destination') + '"]')
          : $('[data-destination-option="' + id + '"]');
        if (focusTarget) focusTarget.focus();
      }
    });

    $$('[data-destination-option]').forEach(function (input) {
      input.addEventListener('change', function () {
        setDestination(input.getAttribute('data-destination-option'), input.checked, 'form');
      });
    });
    var help = $('[data-help-choose]');
    if (help) help.addEventListener('change', function () { clearFieldError('destinations'); });

    syncTrip();
  }

  /* --------------------------------------------------------------------
     Contact links (rendered only for values that are configured)
     -------------------------------------------------------------------- */
  function renderContact() {
    var list = $('[data-contact-links]');
    var social = $('[data-social-links]');
    var copy = $('[data-contact-copy]');
    var privacy = $('[data-privacy-contact]');
    var email = validEmail(CONTACT.email) ? CONTACT.email.trim() : '';
    var wa = whatsappUrl(CONTACT.whatsapp);

    function contactLink(href, icon, label, external) {
      return el('li', null, [el('a', {
        class: 'btn btn-outline',
        href: href,
        target: external ? '_blank' : null,
        rel: external ? 'noopener' : null,
        html: ICONS[icon],
      }, [label])]);
    }

    if (list) {
      if (email) list.appendChild(contactLink('mailto:' + email, 'mail', email));
      if (wa) list.appendChild(contactLink(wa, 'whatsapp', 'WhatsApp', true));
    }
    if (copy && (email || wa)) {
      copy.textContent = '';
      copy.appendChild(document.createTextNode('Send a travel enquiry using the '));
      copy.appendChild(el('a', { href: '#plan', text: 'form above' }));
      copy.appendChild(document.createTextNode(', or contact Ayesha directly.'));
    }
    if (privacy && email) {
      privacy.appendChild(document.createTextNode(' or write to '));
      privacy.appendChild(el('a', { href: 'mailto:' + email, text: email }));
    }

    if (social) {
      [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok']].forEach(function (pair) {
        var url = httpsUrl(CONTACT[pair[0]]);
        if (!url) return;
        social.appendChild(el('li', null, [el('a', { href: url, target: '_blank', rel: 'noopener', 'aria-label': 'Ayesha Travel on ' + pair[1] + ' (opens in a new tab)', html: ICONS[pair[0]] })]));
      });
    }

    var year = $('[data-year]');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* --------------------------------------------------------------------
     Enquiry form
     -------------------------------------------------------------------- */
  var form, statusBox, submitButton, submitLabel, startedAt;
  var FIELD_LABELS = {
    fullName: 'Full name',
    email: 'Email address',
    whatsapp: 'WhatsApp number',
    country: 'Country of residence',
    stayLength: 'Length of stay',
    arrivalDate: 'Arrival date',
    departureDate: 'Departure date',
    adults: 'Adults',
    children: 'Children',
    destinations: 'Destinations',
    accommodation: 'Accommodation preference',
    budgetAmount: 'Approximate budget',
    message: 'Special requests',
    consent: 'Permission to respond',
  };

  function todayIso() {
    var now = new Date();
    var local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function fieldTarget(name) {
    if (name === 'destinations') return $('[data-destinations-group]');
    return form.elements[name] && form.elements[name].nodeType ? form.elements[name] : $('#' + name);
  }

  function setFieldError(name, message) {
    var box = $('[data-error-for="' + name + '"]', form);
    var target = fieldTarget(name);
    if (box) box.textContent = message;
    if (target) target.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError(name) {
    if (!form) return;
    var box = $('[data-error-for="' + name + '"]', form);
    var target = fieldTarget(name);
    if (box) box.textContent = '';
    if (target) target.removeAttribute('aria-invalid');
  }

  function clearAllErrors() {
    $$('[data-error-for]', form).forEach(function (box) { clearFieldError(box.getAttribute('data-error-for')); });
  }

  function values(name) {
    return $$('[name="' + name + '"]:checked', form).map(function (i) { return i.value; });
  }

  function collect() {
    var f = form.elements;
    var datesStatus = (values('datesStatus')[0]) || 'undecided';
    return {
      fullName: f.fullName.value.trim(),
      email: f.email.value.trim(),
      country: f.country.value.trim(),
      whatsapp: f.whatsapp.value.trim(),
      stayLength: f.stayLength.value,
      datesStatus: datesStatus,
      arrivalDate: datesStatus === 'undecided' ? '' : f.arrivalDate.value,
      departureDate: datesStatus === 'undecided' ? '' : f.departureDate.value,
      adults: f.adults.value.trim(),
      children: f.children.value.trim(),
      destinations: values('destinations'),
      interests: values('interests'),
      arrangements: values('arrangements'),
      accommodation: f.accommodation.value,
      budgetCurrency: f.budgetCurrency.value,
      budgetAmount: f.budgetUndecided.checked ? '' : f.budgetAmount.value.trim(),
      budgetBasis: f.budgetBasis.value,
      budgetUndecided: f.budgetUndecided.checked,
      message: f.message.value.trim(),
      consent: f.consent.checked,
      website: f.website.value,
      formStartedAt: startedAt,
    };
  }

  // Mirrors the server-side rules in lib/enquiry.js (the server remains the authority).
  function validate(data) {
    var errors = {};
    var today = todayIso();
    if (!data.fullName) errors.fullName = 'Please enter your full name.';
    else if (data.fullName.length > 100) errors.fullName = 'Please keep this under 100 characters.';
    if (!data.email) errors.email = 'Please enter your email address.';
    else if (!validEmail(data.email) || data.email.length > 254) errors.email = 'Please enter a valid email address, for example name@example.com.';
    if (data.whatsapp && !/^\+[0-9][0-9 ()-]{6,22}$/.test(data.whatsapp)) errors.whatsapp = 'Please include your country code, for example +44 7700 900123.';
    if (!data.stayLength) errors.stayLength = 'Please choose your length of stay.';
    if (data.datesStatus !== 'undecided') {
      if (form.elements.arrivalDate.validity.badInput) errors.arrivalDate = 'Please enter a valid arrival date.';
      else if (data.arrivalDate && data.arrivalDate < today) errors.arrivalDate = 'Arrival date cannot be in the past.';
      if (form.elements.departureDate.validity.badInput) errors.departureDate = 'Please enter a valid departure date.';
      else if (data.departureDate && data.departureDate < today) errors.departureDate = 'Departure date cannot be in the past.';
      if (!errors.arrivalDate && !errors.departureDate && data.arrivalDate && data.departureDate && data.departureDate <= data.arrivalDate) {
        errors.departureDate = 'Departure date must be after your arrival date.';
      }
    }
    function count(name, min, max) {
      var input = form.elements[name];
      if (input.validity.badInput) { errors[name] = 'Please enter a whole number between ' + min + ' and ' + max + '.'; return; }
      if (data[name] === '') return;
      var n = Number(data[name]);
      if (!Number.isInteger(n) || n < min || n > max) errors[name] = 'Please enter a whole number between ' + min + ' and ' + max + '.';
    }
    count('adults', 1, 30);
    count('children', 0, 20);
    if (!data.destinations.length) errors.destinations = 'Please choose at least one destination, or select “Help me choose”.';
    if (!data.budgetUndecided) {
      if (form.elements.budgetAmount.validity.badInput || (data.budgetAmount && !(Number(data.budgetAmount) > 0)) || data.budgetAmount.length > 12) {
        errors.budgetAmount = 'Please enter an approximate amount as a positive number, or choose “Not decided”.';
      }
    }
    if (data.message.length > 3000) errors.message = 'Please keep this under 3000 characters.';
    if (!data.consent) errors.consent = 'Please confirm we may use these details to respond to your enquiry.';
    return errors;
  }

  function showStatus(kind, title, paragraphs, errorList) {
    statusBox.className = 'form-status ' + (kind === 'success' ? 'is-success' : 'is-error');
    statusBox.textContent = '';
    statusBox.appendChild(el('h3', { text: title }));
    (paragraphs || []).forEach(function (p) {
      statusBox.appendChild(typeof p === 'string' ? el('p', { text: p }) : p);
    });
    if (errorList && errorList.length) {
      statusBox.appendChild(el('ul', null, errorList.map(function (item) {
        return el('li', null, [el('a', { href: '#' + item.id, 'data-jump': item.name, text: item.label + ': ' + item.message })]);
      })));
    }
    statusBox.hidden = false;
  }

  function focusStatus() {
    statusBox.focus({ preventScroll: true });
    statusBox.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function applyErrors(errors) {
    var names = Object.keys(errors);
    names.forEach(function (name) { setFieldError(name, errors[name]); });
    var list = names.map(function (name) {
      var target = fieldTarget(name);
      var focusable = name === 'destinations' ? $('[data-destinations-group] input', form) : target;
      return { name: name, id: focusable && focusable.id ? focusable.id : name, label: FIELD_LABELS[name] || name, message: errors[name] };
    });
    showStatus('error', names.length === 1 ? 'Please check one detail' : 'Please check ' + names.length + ' details', ['Your information has been kept. Correct the following and send again:'], list);
    focusStatus();
  }

  function contactFallback() {
    var email = validEmail(CONTACT.email) ? CONTACT.email.trim() : '';
    var wa = whatsappUrl(CONTACT.whatsapp);
    if (!email && !wa) return null;
    var p = el('p', null, ['If the problem continues, you can also contact Ayesha ']);
    if (email) { p.appendChild(document.createTextNode('by email at ')); p.appendChild(el('a', { href: 'mailto:' + email, text: email })); }
    if (email && wa) p.appendChild(document.createTextNode(' or '));
    if (wa) { p.appendChild(document.createTextNode('on ')); p.appendChild(el('a', { href: wa, target: '_blank', rel: 'noopener', text: 'WhatsApp' })); }
    p.appendChild(document.createTextNode('.'));
    return p;
  }

  function setSubmitting(on) {
    form.classList.toggle('is-submitting', on);
    form.setAttribute('aria-busy', String(on));
    submitButton.disabled = on;
    submitLabel.textContent = on ? 'Sending your enquiry…' : 'Send My Travel Enquiry';
  }

  function postEnquiry(data) {
    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 20000) : null;
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
      signal: controller ? controller.signal : undefined,
      credentials: 'same-origin',
    }).then(function (response) {
      if (timer) clearTimeout(timer);
      return response.json().catch(function () { return {}; }).then(function (body) {
        return { status: response.status, ok: response.ok && body && body.ok === true, body: body || {} };
      });
    }, function (err) {
      if (timer) clearTimeout(timer);
      throw err;
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    if (form.classList.contains('is-submitting')) return;
    clearAllErrors();
    statusBox.hidden = true;

    var data = collect();
    var errors = validate(data);
    if (Object.keys(errors).length) { applyErrors(errors); return; }

    setSubmitting(true);
    postEnquiry(data).then(function (result) {
      setSubmitting(false);
      if (result.ok) {
        onSuccess(data);
        return;
      }
      if (result.status === 422 && result.body.errors) { applyErrors(result.body.errors); return; }
      var paragraphs = [result.body.message || 'We could not send your enquiry just now.', 'Your details are still in the form. Please try again in a moment.'];
      var fallback = contactFallback();
      if (fallback) paragraphs.push(fallback);
      showStatus('error', 'Your enquiry has not been sent', paragraphs);
      focusStatus();
    }).catch(function () {
      setSubmitting(false);
      var paragraphs = ['We could not reach the enquiry service. Please check your internet connection and try again.', 'Your details are still in the form.'];
      var fallback = contactFallback();
      if (fallback) paragraphs.push(fallback);
      showStatus('error', 'Your enquiry has not been sent', paragraphs);
      focusStatus();
    });
  }

  function onSuccess(data) {
    var firstName = data.fullName.split(' ')[0];
    form.reset();
    $$('[data-destination-option]', form).forEach(function (i) { i.checked = false; });
    syncTrip();
    updateDateFields();
    updateBudget();
    updateCounter();
    startedAt = Date.now();
    var again = el('button', { type: 'button', class: 'btn btn-outline', text: 'Send another enquiry' });
    again.addEventListener('click', function () {
      statusBox.hidden = true;
      form.elements.fullName.focus();
    });
    showStatus('success', 'Thank you, ' + firstName + '. Your enquiry has been sent.', [
      'Ayesha has received your travel details and will reply by email to ' + data.email + '.',
      'Remember, this is an enquiry rather than a booking: nothing has been reserved or charged.',
      again,
    ]);
    focusStatus();
  }

  function updateDateFields() {
    var status = values('datesStatus')[0] || 'undecided';
    var wrap = $('[data-date-fields]', form);
    wrap.hidden = status === 'undecided';
    if (status === 'undecided') { clearFieldError('arrivalDate'); clearFieldError('departureDate'); }
  }

  function updateBudget() {
    var undecided = form.elements.budgetUndecided.checked;
    form.elements.budgetAmount.disabled = undecided;
    form.elements.budgetBasis.disabled = undecided;
    form.elements.budgetCurrency.disabled = undecided;
    if (undecided) clearFieldError('budgetAmount');
  }

  function updateCounter() {
    var counter = $('[data-counter-for="message"]', form);
    var len = form.elements.message.value.length;
    counter.textContent = len ? len.toLocaleString() + ' of 3,000 characters' : 'Up to 3,000 characters.';
  }

  function initForm() {
    form = $('[data-enquiry-form]');
    if (!form) return;
    statusBox = $('[data-form-status]', form);
    submitButton = $('[data-submit]', form);
    submitLabel = $('[data-submit-label]', form);
    startedAt = Date.now();

    var today = todayIso();
    form.elements.arrivalDate.min = today;
    form.elements.departureDate.min = today;
    form.elements.arrivalDate.addEventListener('change', function () {
      var arrival = form.elements.arrivalDate.value;
      form.elements.departureDate.min = arrival || today;
    });

    $$('[name="datesStatus"]', form).forEach(function (r) { r.addEventListener('change', updateDateFields); });
    form.elements.budgetUndecided.addEventListener('change', updateBudget);
    form.elements.message.addEventListener('input', updateCounter);

    // Clear a field's error as soon as the visitor changes it.
    form.addEventListener('input', function (e) { if (e.target.name) clearFieldError(e.target.name); });
    form.addEventListener('change', function (e) { if (e.target.name) clearFieldError(e.target.name); });

    statusBox.addEventListener('click', function (e) {
      var jump = e.target.closest('[data-jump]');
      if (!jump) return;
      var target = document.getElementById(jump.getAttribute('href').slice(1));
      if (target) { e.preventDefault(); target.focus(); target.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }); }
    });

    form.addEventListener('submit', onSubmit);
    updateDateFields();
    updateBudget();
    updateCounter();
  }

  /* --------------------------------------------------------------------
     Gentle reveal on scroll (skipped for reduced motion)
     -------------------------------------------------------------------- */
  function initReveal() {
    var items = $$('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (i) { i.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (i) { io.observe(i); });
  }

  renderDestinations();
  renderContact();
  initNav();
  initForm();
  initTrip();
  initReveal();
})();
