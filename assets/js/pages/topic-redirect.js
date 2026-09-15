(function () {
  var link = document.getElementById('unified-destination');
  if (!link) return;
  var destination = new URL(link.href, location.href);
  destination.search = location.search;
  destination.hash = location.hash || '#panorama-global';
  location.replace(destination.href);
}());
