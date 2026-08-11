fetch('/sidebar-content.html').then(r => r.text()).then(html => {
                document.getElementById('sidebar').innerHTML = html;
                var s = document.createElement('script'); s.src = '/assets/js/main.js'; document.body.appendChild(s);
            });
