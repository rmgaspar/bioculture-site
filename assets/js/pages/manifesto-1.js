fetch("/sidebar-content.html").then((r) => r.text()).then((h) =>
                document.getElementById("sidebar").innerHTML = h
            );
