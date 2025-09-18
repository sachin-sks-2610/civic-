
    // ✅ Firebase Config
    const firebaseConfig = {
        apiKey: "AIzaSyAsYL7IqeIISE1yaTz2M_96oTEr3kcStH8",
        authDomain: "crowd-sourced-civic-report.firebaseapp.com",
        projectId: "crowd-sourced-civic-report",
        storageBucket: "crowd-sourced-civic-report.appspot.com",
        messagingSenderId: "1020573384438",
        appId: "1:1020573384438:web:adf653cf0c0b18baf765b3"
    };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    let map, reportMap, reportMarker;
    let markers = [];

    // ================================
    // 🌍 Init Maps
    // ================================
    function initMap() {
        if (!map) {
            map = L.map("map").setView([11.1271, 78.6569], 13);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
        }
        updateMapMarkers();
    }

    function initReportMap() {
        if (!reportMap) {
            reportMap = L.map("reportMap").setView([11.1271, 78.6569], 13);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(reportMap);
            reportMap.on("click", function (e) {
                document.getElementById("issueLat").value = e.latlng.lat;
                document.getElementById("issueLng").value = e.latlng.lng;
                if (reportMarker) reportMap.removeLayer(reportMarker);
                reportMarker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(reportMap);
            });
        } else {
            reportMap.invalidateSize();
        }
    }

    // ================================
    // 📍 Detect Location
    // ================================
    function detectLocation() {
        if (!navigator.geolocation) {
            alert("Geolocation not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                document.getElementById("issueLat").value = lat;
                document.getElementById("issueLng").value = lng;

                if (reportMarker) reportMap.removeLayer(reportMarker);

                reportMarker = L.marker([lat, lng]).addTo(reportMap)
                    .bindPopup("📍 Your Location").openPopup();

                reportMap.setView([lat, lng], 15);
            },
            (err) => {
                console.error(err);
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        alert("❌ Permission denied. Allow location access.");
                        break;
                    case err.POSITION_UNAVAILABLE:
                        alert("❌ Location info unavailable.");
                        break;
                    case err.TIMEOUT:
                        alert("⏳ Location request timed out.");
                        break;
                    default:
                        alert("⚠️ Couldn’t detect location.");
                }
            }
        );
    }

    // ================================
    // 📝 Submit Issue
    // ================================
    function submitIssue() {
        const type = document.getElementById("issueType").value;
        const ward = document.getElementById("issueWard").value;
        const desc = document.getElementById("issueDesc").value;
        const lat = document.getElementById("issueLat").value;
        const lng = document.getElementById("issueLng").value;

        if (!ward || !desc || !lat || !lng) {
            alert("Please fill all required fields.");
            return;
        }

        const newIssue = {
            type,
            ward,
            desc,
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            progress: 0,
            timestamp: Date.now()
        };

        db.collection("issues").add(newIssue)
            .then(() => {
                closeReport();
                alert("✅ Issue submitted successfully.");
                updateMapMarkers();
            })
            .catch(err => {
                console.error(err);
                alert("❌ Error submitting issue.");
            });
    }

    // ================================
    // 📌 Update Map Markers
    // ================================
    function updateMapMarkers() {
        db.collection("issues").get().then(snapshot => {
            markers.forEach(marker => map.removeLayer(marker));
            markers = [];
            snapshot.forEach(doc => {
                const issue = doc.data();
                if (issue.lat && issue.lng) {
                    const marker = L.marker([issue.lat, issue.lng]).addTo(map)
                        .bindPopup(
                            `<b>${issue.type}</b><br>
                             Ward: ${issue.ward}<br>
                             ${issue.desc}<br>
                             Progress: ${issue.progress || 0}%`
                        );
                    markers.push(marker);
                }
            });
        });
    }

    // ================================
    // 📋 Render Issues (Public View)
    // ================================
    function renderIssues() {
        db.collection("issues").get().then(snapshot => {
            const container = document.getElementById("issuesList");
            container.innerHTML = "";
            snapshot.forEach(doc => {
                const issue = doc.data();
                const div = document.createElement("div");
                div.className = "issue-item";
                div.innerHTML = `
                    <h5>${issue.type}</h5>
                    <p><strong>Ward:</strong> ${issue.ward}</p>
                    <p><strong>Description:</strong> ${issue.desc}</p>
                    <p><strong>Location:</strong> ${issue.lat}, ${issue.lng}</p>
                    <progress value="${issue.progress || 0}" max="100"></progress>
                `;
                container.appendChild(div);
            });
        });
    }

    // ================================
    // 🛠 Officer Dashboard
    // ================================
    function renderOfficerIssues() {
        db.collection("issues").onSnapshot(snapshot => {
            const officerDiv = document.getElementById("officerIssues");
            officerDiv.innerHTML = "";
            snapshot.forEach(doc => {
                const issue = doc.data();
                officerDiv.innerHTML += `
                    <div class="issue-card">
                        <h3>${issue.type} – Ward ${issue.ward}</h3>
                        <p>${issue.desc}</p>
                        <progress value="${issue.progress || 0}" max="100"></progress>
                        <button onclick="updateProgress('${doc.id}', ${(issue.progress || 0) + 10})">
                            +10% Progress
                        </button>
                    </div>
                `;
            });
        });
    }

    function updateProgress(id, newVal) {
        if (newVal > 100) newVal = 100;
        db.collection("issues").doc(id).update({ progress: newVal });
    }

    // ================================
    // 🔐 Officer Login
    // ================================
    function officerLogin() {
        const officerId = document.getElementById("officerId").value.trim();
        const officerPassword = document.getElementById("officerPassword").value.trim();
        const validId = "admin";
        const validPassword = "admin123";
        if (officerId === validId && officerPassword === validPassword) {
            localStorage.setItem("officerLoggedIn", "true");
            localStorage.setItem("officerId", officerId);
            closeOfficerLogin();
            showOfficerDashboard();
            renderOfficerIssues();
        } else {
            alert("Invalid Officer ID or Password");
        }
    }

    function logoutOfficer() {
        localStorage.removeItem("officerLoggedIn");
        localStorage.removeItem("officerId");
        showHome();
    }

    // ================================
    // 📂 UI Controls
    // ================================
    function openReport(defaultType = "") {
        document.getElementById("reportModal").classList.add("show");
        if (defaultType) document.getElementById("issueType").value = defaultType;
        setTimeout(() => { initReportMap(); reportMap.invalidateSize(); }, 300);
    }

    function closeReport() {
        document.getElementById("reportModal").classList.remove("show");
        if (reportMarker) { reportMap.removeLayer(reportMarker); reportMarker = null; }
        document.getElementById("issueLat").value = "";
        document.getElementById("issueLng").value = "";
    }

    function openOfficerLogin() { document.getElementById("officerLoginModal").classList.add("show"); }
    function closeOfficerLogin() { document.getElementById("officerLoginModal").classList.remove("show"); }

    function showHome() {
        document.getElementById("homeView").style.display = "block";
        document.getElementById("mapView").style.display = "none";
        document.getElementById("listView").style.display = "none";
        document.getElementById("officerView").style.display = "none";
    }

    function showMap() {
        document.getElementById("homeView").style.display = "none";
        document.getElementById("mapView").style.display = "block";
        document.getElementById("listView").style.display = "none";
        document.getElementById("officerView").style.display = "none";
        setTimeout(() => { initMap(); map.invalidateSize(); }, 100);
    }

    function showList() {
        document.getElementById("homeView").style.display = "none";
        document.getElementById("mapView").style.display = "none";
        document.getElementById("listView").style.display = "block";
        document.getElementById("officerView").style.display = "none";
        setTimeout(renderIssues, 100);
    }

    function showOfficerDashboard() {
        document.getElementById("homeView").style.display = "none";
        document.getElementById("mapView").style.display = "none";
        document.getElementById("listView").style.display = "none";
        document.getElementById("officerView").style.display = "block";
        renderOfficerIssues();
    }

    // ================================
    // 🚀 Page Load
    // ================================
    document.addEventListener("DOMContentLoaded", () => {
        if (localStorage.getItem("officerLoggedIn") === "true") showOfficerDashboard();
        else showHome();
    });

