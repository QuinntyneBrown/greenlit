// Slide runtime for docs/videos/*/slides.html. One 1920x1080 <section> is visible at a time.
// ?slide=N (1-based), #N or the arrow keys pick it; tools/video-build screenshots ?slide=N for every
// slide with ?render=1 (pins the scale: headless windows misreport their size), and ?audit=1 publishes
// the overflow check on <body data-audit> (and an empty data-clips: these decks have no recordings).
(function () {
  const body = document.body;
  const slides = Array.from(document.querySelectorAll('body > section'));
  const params = new URLSearchParams(location.search);
  let current = 0;
  function fit() {
    const k = params.has('render') ? 1 : Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    document.documentElement.style.setProperty('--fit', String(k));
  }
  function show(i) {
    current = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, j) => s.classList.toggle('active', j === current));
  }
  show((Number(params.get('slide') || location.hash.replace('#', '')) || 1) - 1);
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('keydown', (e) => {
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) show(current + 1);
    if (['ArrowLeft', 'PageUp'].includes(e.key)) show(current - 1);
    history.replaceState(null, '', '#' + (current + 1));
  });
  if (params.has('audit')) {
    const problems = [];
    slides.forEach((s, i) => {
      show(i);
      if (s.scrollHeight > 1081 || s.scrollWidth > 1921) problems.push({ slide: i + 1, id: s.id, issue: 'content overflows the slide', height: s.scrollHeight });
    });
    body.setAttribute('data-audit', JSON.stringify(problems));
    body.setAttribute('data-clips', '[]');
    show(0);
  }
  body.classList.add('ready');
})();
