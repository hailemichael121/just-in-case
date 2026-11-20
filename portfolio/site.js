// Just in Case — shared site behaviour: nav, reveal, checksum copy. No dependencies.
(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  // Mobile navigation: aria-expanded, Escape to close, close on link click.
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      links.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    links.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  // Opacity-only reveal. Skipped entirely when motion is reduced.
  var revealItems = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    revealItems.forEach(function (item) {
      observer.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add('is-visible');
    });
  }

  // Copy-to-clipboard for SHA-256 rows. Falls back to selecting the text.
  document.querySelectorAll('.copy-btn[data-copy]').forEach(function (button) {
    button.addEventListener('click', function () {
      var value = button.getAttribute('data-copy') || '';
      var done = function () {
        var label = button.textContent;
        button.textContent = 'Copied';
        setTimeout(function () {
          button.textContent = label;
        }, 1600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done, fallback);
      } else {
        fallback();
      }

      function fallback() {
        var field = document.createElement('textarea');
        field.value = value;
        field.setAttribute('readonly', '');
        field.style.position = 'absolute';
        field.style.left = '-9999px';
        document.body.appendChild(field);
        field.select();
        try {
          document.execCommand('copy');
          done();
        } catch (error) {
          button.textContent = 'Select the text';
        }
        field.remove();
      }
    });

    // First-visit onboarding guide
    (function () {
      var firstVisitKey = 'just-in-case-first-visit';
      var guide = document.getElementById('first-visit-guide');
      var hasSeen = localStorage.getItem(firstVisitKey);
      if (hasSeen) {
        guide.style.display = 'none';
        return;
      }
      guide.style.display = 'flex';

      var closeBtn = guide.querySelector('.guide-close');
      closeBtn.addEventListener('click', function () {
        guide.style.display = 'none';
        localStorage.setItem(firstVisitKey, '1');
      });

      // Close if user clicks anywhere outside the content
      guide.addEventListener('click', function (e) {
        if (e.target === guide) {
          guide.style.display = 'none';
          localStorage.setItem(firstVisitKey, '1');
        }
      });
    })();

  // The footer year is real, not hard-coded.
  document.querySelectorAll('[data-year]').forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });
})();
