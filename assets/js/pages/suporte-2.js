
            fetch("sidebar-content.html").then((response) => response.text()).then((data) => {
                document.getElementById("sidebar").innerHTML = data;
                var script = document.createElement("script");
                script.src = "assets/js/main.js";
                document.body.appendChild(script);
            });
        