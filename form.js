document.addEventListener('DOMContentLoaded', function () {


    // Location Picker Functionality
    // Location Picker Integration
    const locationPickerModal = new bootstrap.Modal(document.getElementById('locationPickerModal'));
    const taskLocationInput = document.getElementById('taskLocation');
    const openLocationPickerBtn = document.getElementById('openLocationPicker');

    // Open location picker modal
    openLocationPickerBtn.addEventListener('click', function () {
        locationPickerModal.show();
    });

    // Initialize location picker when modal is shown
    document.getElementById('locationPickerModal').addEventListener('shown.bs.modal', function () {
        initializeLocationPicker();
    });

    function initializeLocationPicker() {
        // Your exact location picker JavaScript code
        const map = L.map('map', { zoomControl: false }).setView([20, 0], 3);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        const address1 = document.getElementById('addressLine1');
        const address2 = document.getElementById('addressLine2');
        const loading = document.getElementById('loading');
        const gpsBtn = document.getElementById('gpsBtn');
        const retryBtn = document.getElementById('retryBtn');
        const confirmBtn = document.getElementById('confirmLocationBtn'); // Changed ID
        const input = document.getElementById('locationInput');
        const searchButton = document.getElementById('searchButton');
        const searchResults = document.getElementById('searchResults');
        const latitudeValue = document.getElementById('latitudeValue');
        const longitudeValue = document.getElementById('longitudeValue');
        const accuracyValue = document.getElementById('accuracyValue');

        function startLoading(msg = "Detecting location...") {
            loading.style.display = 'flex';
            loading.querySelector('p').textContent = msg;
        }

        function stopLoading() {
            loading.style.display = 'none';
        }

        function updateAddress(lat, lng) {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
                .then(r => r.json())
                .then(data => {
                    if (data.display_name) {
                        address1.textContent = data.display_name.split(',')[0];
                        address2.textContent = data.display_name.split(',').slice(1, 4).join(', ');
                        input.value = data.display_name;
                    } else {
                        address1.textContent = "Unknown location";
                        address2.textContent = "";
                    }
                }).catch(() => {
                    address1.textContent = "Error fetching address";
                    address2.textContent = "";
                });
        }

        function detectLocation() {
            startLoading();
            if (!navigator.geolocation) {
                address1.textContent = "Geolocation not supported";
                stopLoading();
                return;
            }
            navigator.geolocation.getCurrentPosition(pos => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                map.setView([lat, lng], 17);
                updateAddress(lat, lng);
                latitudeValue.textContent = lat.toFixed(5);
                longitudeValue.textContent = lng.toFixed(5);
                accuracyValue.textContent = `±${Math.round(pos.coords.accuracy)}m`;
                stopLoading();
            }, err => {
                address1.textContent = "Unable to detect location";
                stopLoading();
            }, { enableHighAccuracy: true });
        }

        // Update coordinates & address on map move
        map.on('move', () => {
            const center = map.getCenter();
            latitudeValue.textContent = center.lat.toFixed(5);
            longitudeValue.textContent = center.lng.toFixed(5);
            accuracyValue.textContent = "Center selection";
            updateAddress(center.lat, center.lng);
        });

        function searchLocation(query) {
            if (!query || query.length < 3) {
                searchResults.style.display = 'none';
                return;
            }
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
                .then(r => r.json())
                .then(res => {
                    searchResults.innerHTML = '';
                    if (res.length) {
                        res.forEach(item => {
                            const div = document.createElement('div');
                            div.className = 'search-result';
                            div.textContent = item.display_name;
                            div.onclick = () => {
                                const lat = parseFloat(item.lat);
                                const lng = parseFloat(item.lon);
                                map.setView([lat, lng], 17);
                                searchResults.style.display = 'none';
                            };
                            searchResults.appendChild(div);
                        });
                        searchResults.style.display = 'block';
                    } else searchResults.style.display = 'none';
                }).catch(() => {
                    searchResults.style.display = 'none';
                });
        }

        // Events - Modified confirmBtn to save to form input and close modal
        gpsBtn.onclick = detectLocation;
        retryBtn.onclick = detectLocation;

        // In the initializeLocationPicker function, update the confirmBtn click handler:
        confirmBtn.onclick = () => {
            const center = map.getCenter();
            const address = address1.textContent + (address2.textContent ? ', ' + address2.textContent : '');
            const latitude = center.lat;
            const longitude = center.lng;

            // Save to form input with coordinates as data attributes
            taskLocationInput.value = address;
            taskLocationInput.setAttribute('data-latitude', latitude);
            taskLocationInput.setAttribute('data-longitude', longitude);
            taskLocationInput.setAttribute('data-full-address', address);

            // Close modal
            locationPickerModal.hide();

            console.log('Location saved:', address, 'Coords:', latitude, longitude);
        };


        searchButton.onclick = () => searchLocation(input.value);
        input.oninput = () => searchLocation(input.value);
        input.onkeypress = e => {
            if (e.key === 'Enter') searchLocation(input.value);
        };

        document.addEventListener('click', e => {
            if (!input.contains(e.target) && !searchResults.contains(e.target)) searchResults.style.display = 'none';
        });

        document.getElementById('zoomIn').onclick = () => map.zoomIn();
        document.getElementById('zoomOut').onclick = () => map.zoomOut();

        // Initialize with current location
        detectLocation();

        // Clean up map when modal is closed
        document.getElementById('locationPickerModal').addEventListener('hidden.bs.modal', function () {
            map.remove();
        });
    }


    localStorage.removeItem('taskPhoto');

    const form = document.getElementById('taskForm');
    const generateBtn = document.getElementById('generateDoc');
    const downloadBtn = document.getElementById('downloadDoc');
    const preview = document.getElementById('documentPreview');
    const takePhotoBtn = document.getElementById('takePhoto');
    const photoStatus = document.getElementById('photoStatus');
    const photoStatusText = document.getElementById('photoStatusText');

    // Camera elements
    const cameraModal = new bootstrap.Modal(document.getElementById('cameraModal'));
    const cameraPreview = document.getElementById('cameraPreview');
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    const usePhotoBtn = document.getElementById('usePhotoBtn');
    const capturedPhotoContainer = document.getElementById('capturedPhotoContainer');
    const capturedPhoto = document.getElementById('capturedPhoto');
    const photoCanvas = document.getElementById('photoCanvas');

    let cameraStream = null;
    let currentPhotoData = null;

    // Set today's date as default
    document.getElementById('date').valueAsDate = new Date();

    // Take Photo Functionality
    takePhotoBtn.addEventListener('click', function () {
        openCamera();
    });

    function openCamera() {
        // Reset UI
        capturedPhotoContainer.style.display = 'none';
        cameraPreview.style.display = 'block';
        captureBtn.style.display = 'block';
        retakeBtn.style.display = 'none';
        usePhotoBtn.style.display = 'none';

        // Check camera support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('📱 Camera not supported in this browser.\n\nPlease use:\n• Chrome on Android\n• Safari on iOS\n• Latest Firefox');
            return;
        }

        // Show loading state
        takePhotoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Accessing Camera...';
        takePhotoBtn.disabled = true;

        // Request camera access
        navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Use back camera
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        })
            .then(function (stream) {
                cameraStream = stream;
                cameraPreview.srcObject = stream;
                takePhotoBtn.innerHTML = '<i class="fas fa-camera"></i> Take Photo with Camera';
                takePhotoBtn.disabled = false;

                // Show camera modal
                cameraModal.show();

                // Setup capture button
                captureBtn.onclick = capturePhoto;
            })
            .catch(function (error) {
                console.error('Camera error:', error);
                takePhotoBtn.innerHTML = '<i class="fas fa-camera"></i> Take Photo with Camera';
                takePhotoBtn.disabled = false;

                let errorMessage = ' Cannot access camera: ';

                if (error.name === 'NotAllowedError') {
                    errorMessage += 'Permission denied.\n\nPlease allow camera access in your browser settings and try again.';
                } else if (error.name === 'NotFoundError') {
                    errorMessage += 'No camera found.';
                } else if (error.name === 'NotSupportedError') {
                    errorMessage += 'Camera not supported.';
                } else {
                    errorMessage += error.message;
                }

                alert(errorMessage);
            });
    }

    function capturePhoto() {
        if (!cameraStream) return;

        // Set canvas size to match video
        const video = cameraPreview;
        photoCanvas.width = video.videoWidth;
        photoCanvas.height = video.videoHeight;

        // Draw video frame to canvas
        const context = photoCanvas.getContext('2d');
        context.drawImage(video, 0, 0, photoCanvas.width, photoCanvas.height);

        // Get image data
        currentPhotoData = photoCanvas.toDataURL('image/jpeg', 0.8);

        // Show captured photo
        capturedPhoto.src = currentPhotoData;
        capturedPhotoContainer.style.display = 'block';
        cameraPreview.style.display = 'none';
        captureBtn.style.display = 'none';
        retakeBtn.style.display = 'block';
        usePhotoBtn.style.display = 'block';

        // Setup retake button
        retakeBtn.onclick = function () {
            capturedPhotoContainer.style.display = 'none';
            cameraPreview.style.display = 'block';
            captureBtn.style.display = 'block';
            retakeBtn.style.display = 'none';
            usePhotoBtn.style.display = 'none';
        };

        // Setup use photo button
        usePhotoBtn.onclick = function () {
            // Save photo
            localStorage.setItem('taskPhoto', currentPhotoData);

            // Show success message
            photoStatus.style.display = 'block';
            photoStatusText.textContent = 'Photo captured successfully! Ready to attach to document.';

            // Close modal
            cameraModal.hide();
            stopCamera();
        };
    }

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
    }

    // Close camera when modal is hidden
    document.getElementById('cameraModal').addEventListener('hidden.bs.modal', function () {
        stopCamera();
    });

    // Generate Document
    generateBtn.addEventListener('click', function () {
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        generateDocument();
    });

    function generateDocument() {
        // Get form values
        const taskName = document.getElementById('taskName').value;
        const taskNo = document.getElementById('taskNo').value;
        const accountNo = document.getElementById('accountNo').value;
        const companyName = document.getElementById('companyName').value;
        const transformNo = document.getElementById('transformNo').value;
        const date = document.getElementById('date').value;

        // Get location data
        const locationInput = document.getElementById('taskLocation');
        const locationAddress = locationInput.value;
        const locationLat = locationInput.getAttribute('data-latitude');
        const locationLng = locationInput.getAttribute('data-longitude');

        const address = document.getElementById('address').value;
        const description = document.getElementById('description').value;

        // Format date
        const formattedDate = new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Get saved drawing if available
        const savedDrawingImg = document.getElementById('savedDrawingImg');
        const drawingData = savedDrawingImg.style.display !== 'none' ? savedDrawingImg.src : null;

        // Get photo if available
        const photoData = localStorage.getItem('taskPhoto');

        // Generate document HTML
        let documentHTML = `
                <div class="document-header">
                    <h2>Task Document</h2>
                    <p class="text-muted">Generated on ${new Date().toLocaleDateString()}</p>
                </div>
                <div class="document-field">
                    <span class="document-label">Task Name:</span>
                    <span>${taskName || 'Not Provided'}</span>
                </div>
                <div class="document-field">
                    <span class="document-label">Task No:</span>
                    <span>${taskNo || 'Not Provided'}</span>
                </div>
                <div class="document-field">
                    <span class="document-label">Account No:</span>
                    <span>${accountNo || 'Not Provided'}</span>
                </div>
                <div class="document-field">
                    <span class="document-label">Company Name:</span>
                    <span>${companyName || 'Not Provided'}</span>
                </div>
                <div class="document-field">
                    <span class="document-label">Transform No:</span>
                    <span>${transformNo || 'Not Provided'}</span>
                </div>
                <div class="document-field">
                    <span class="document-label">Date:</span>
                    <span>${formattedDate}</span>
                </div>
            `;

        // Add location with clickable link if available - ONLY ONCE
        if (locationAddress && locationLat && locationLng) {
            const mapsWebLink = `https://www.google.com/maps?q=${locationLat},${locationLng}`;

            documentHTML += `
            <div class="document-field">
                <span class="document-label">Location:</span>
                <span>
                    <a href="${mapsWebLink}" target="_blank" style="color: #007bff; text-decoration: none;">
                        <i class="fas fa-map-marker-alt"></i> ${locationAddress}
                    </a>
                    <br>
                    <small class="text-muted">Click to open in maps (Lat: ${parseFloat(locationLat).toFixed(5)}, Lng: ${parseFloat(locationLng).toFixed(5)})</small>
                </span>
            </div>
        `;
        } else if (locationAddress) {
            documentHTML += `
            <div class="document-field">
                <span class="document-label">Location:</span>
                <span>${locationAddress}</span>
            </div>
        `;
        } else {
            documentHTML += `
            <div class="document-field">
                <span class="document-label">Location:</span>
                <span>Not Provided</span>
            </div>
        `;
        }

        // Add description field
        documentHTML += `
                <div class="document-field">
                    <span class="document-label">Description:</span>
                    <span>${description || 'Not Provided'}</span>
                </div>
            `;

        // Add address field
        documentHTML += `
                <div class="document-field">
                    <span class="document-label">Address:</span>
                    <span>${address || 'Not Provided'}</span>
                </div>
            `;

        // Add photo if available
        if (photoData) {
            documentHTML += `
                    <div class="document-field">
                        <span class="document-label">Attached Photo:</span>
                        <div class="mt-2">
                            <img src="${photoData}" class="img-fluid rounded" style="max-height: 400px;">
                        </div>
                    </div>
                `;
        } else {
            documentHTML += `
            <div class="document-field">
                    <span class="document-label">Attached Photo:</span>
                    <span>Not Provided</span>
            </div>
        `
        }

        // Add drawing if available
        if (drawingData) {
            documentHTML += `
                    <div class="document-field">
                        <span class="document-label">Drawing/Signature:</span>
                        <div class="mt-2">
                            <img src="${drawingData}" class="img-fluid rounded" style="max-height: 400px;">
                        </div>
                    </div>
                `;
        } else {
            documentHTML += `
            <div class="document-field">
                    <span class="document-label">Drawing/Signature:</span>
                    <span>Not Provided</span>
            </div>
        `
        }

        // Update preview
        preview.innerHTML = documentHTML;

        // Show download button
        downloadBtn.style.display = 'block';

        // Scroll to previewBtn
        preview.scrollIntoView({ behavior: 'smooth' });
    }


    // Download Document - Each Section on Separate Page with Correct Styling
    downloadBtn.addEventListener('click', function () {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const margin = 15;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const contentWidth = pageWidth - 2 * margin;

        // Get form data
        const taskName = document.getElementById('taskName').value || 'Not Provided';
        const taskNo = document.getElementById('taskNo').value || 'Not Provided';
        const accountNo = document.getElementById('accountNo').value || 'Not Provided';
        const companyName = document.getElementById('companyName').value || 'Not Provided';
        const transformNo = document.getElementById('transformNo').value || 'Not Provided';
        const date = document.getElementById('date').value
            ? new Date(document.getElementById('date').value).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            })
            : 'Not Provided';

        // Get location data for PDF
        const locationInput = document.getElementById('taskLocation');
        const locationAddress = locationInput.value;
        const locationLat = locationInput.getAttribute('data-latitude');
        const locationLng = locationInput.getAttribute('data-longitude');

        const address = document.getElementById('address').value || 'Not Provided';

        const description = document.getElementById('description').value || 'Not Provided';
        const photoData = localStorage.getItem('taskPhoto');
        const savedDrawingImg = document.getElementById('savedDrawingImg');
        const drawingData = savedDrawingImg.style.display !== 'none' ? savedDrawingImg.src : null;

        // --- Helper to add wrapped text ---
        function addText(text, x, y, options = {}) {
            const fontSize = options.fontSize || 12;
            const isBold = options.bold || false;
            const maxWidth = options.maxWidth || contentWidth;
            const align = options.align || 'left';

            pdf.setFontSize(fontSize);
            pdf.setFont(undefined, isBold ? 'bold' : 'normal');
            const lines = pdf.splitTextToSize(text, maxWidth);

            // Handle alignment
            if (align === 'center') {
                lines.forEach(line => {
                    const textWidth = pdf.getTextWidth(line);
                    const centeredX = (pageWidth - textWidth) / 2;
                    pdf.text(line, centeredX, y);
                    y += (fontSize * 0.35) + 2;
                });
            } else {
                pdf.text(lines, x, y);
                y += (lines.length * (fontSize * 0.35)) + 2;
            }

            return y;
        }

        // --- Helper to add key-value pairs with bold labels and tab spacing ---
        function addKeyValue(label, value, x, y, options = {}) {
            const fontSize = options.fontSize || 11;
            const tabSpacing = options.tabSpacing || 40;
            const lineHeight = options.lineHeight || 6; // Default line height: 6mm
            const labelFont = options.labelFont || 'bold';
            const valueFont = options.valueFont || 'normal';

            // Add bold label
            pdf.setFontSize(fontSize);
            pdf.setFont(undefined, labelFont);
            pdf.text(label, x, y);

            // Add value with normal font after tab spacing
            pdf.setFontSize(fontSize);
            pdf.setFont(undefined, valueFont);
            const valueLines = pdf.splitTextToSize(value, contentWidth - tabSpacing);

            // Draw each line with proper line height
            let currentY = y;
            valueLines.forEach((line, index) => {
                pdf.text(line, x + tabSpacing, currentY);
                currentY += lineHeight; // Add line height after each line
            });

            // Return the final Y position after all lines
            return currentY;
        }

        // --- Helper to add horizontal line ---
        function addHorizontalLine(y) {
            pdf.setDrawColor(200, 200, 200); // Light gray color
            pdf.line(margin, y, pageWidth - margin, y);
            return y + 5;
        }

        // --- Helper to add full-page image ---
        function addFullPageImage(imgData, title, imageType = 'JPEG') {
            return new Promise((resolve) => {
                pdf.addPage();

                // Add centered title with proper styling
                pdf.setFontSize(13);
                pdf.setFont(undefined, 'bold');
                const titleWidth = pdf.getTextWidth(title);
                const titleX = (pageWidth - titleWidth) / 2;
                pdf.text(title, titleX, 25);

                // Add line under title
                pdf.setDrawColor(200, 200, 200);
                pdf.line(margin, 30, pageWidth - margin, 30);

                const availableHeight = pageHeight - 50; // Account for title and margins
                const availableWidth = pageWidth - 2 * margin;

                const img = new Image();
                img.onload = function () {
                    try {
                        // Calculate dimensions to maintain aspect ratio
                        const aspectRatio = img.width / img.height;
                        let imgWidth = availableWidth;
                        let imgHeight = imgWidth / aspectRatio;

                        if (imgHeight > availableHeight) {
                            imgHeight = availableHeight;
                            imgWidth = imgHeight * aspectRatio;
                        }

                        const x = (pageWidth - imgWidth) / 2;
                        const y = 40;

                        // Add image to PDF
                        pdf.addImage(imgData, imageType, x, y, imgWidth, imgHeight);
                        resolve();
                    } catch (error) {
                        console.error('Error adding image to PDF:', error);
                        // Add error message
                        pdf.setFontSize(10);
                        pdf.text('Error: Could not load image', margin, 50);
                        resolve();
                    }
                };

                img.onerror = function () {
                    // Add error message if image fails to load
                    pdf.setFontSize(10);
                    pdf.text('Error: Could not load image', margin, 50);
                    resolve();
                };

                img.src = imgData;
            });
        }

        // --- Enhanced functions for page breaks ---

        // Function to check if we need a new page
        function checkPageBreak(currentY, neededHeight = 20) {
            if (currentY + neededHeight > pageHeight - margin) {
                pdf.addPage();
                return margin;
            }
            return currentY;
        }

        // Enhanced function to handle page breaks and auto-split content
        function addContentWithPageBreaks(content, x, currentY, options = {}) {
            const fontSize = options.fontSize || 12;
            const isBold = options.bold || false;
            const lineHeight = options.lineHeight || fontSize * 0.35 + 2;
            const maxWidth = options.maxWidth || contentWidth;

            pdf.setFontSize(fontSize);
            pdf.setFont(undefined, isBold ? 'bold' : 'normal');

            const lines = pdf.splitTextToSize(content, maxWidth);
            let yPos = currentY;

            for (let i = 0; i < lines.length; i++) {
                // Check if we need a new page
                if (yPos + lineHeight > pageHeight - margin) {
                    pdf.addPage();
                    yPos = margin;
                }

                pdf.text(lines[i], x, yPos);
                yPos += lineHeight;
            }

            return yPos;
        }

        // Enhanced function for key-value pairs with page breaks
        function addKeyValueWithBreaks(label, value, x, currentY, options = {}) {
            const fontSize = options.fontSize || 11;
            const tabSpacing = options.tabSpacing || 40;
            const lineHeight = options.lineHeight || 6;

            let yPos = currentY;

            // Check space for label
            if (yPos + lineHeight > pageHeight - margin) {
                pdf.addPage();
                yPos = margin;
            }

            // Add bold label
            pdf.setFontSize(fontSize);
            pdf.setFont(undefined, 'bold');
            pdf.text(label, x, yPos);

            // Add value with page break handling
            pdf.setFont(undefined, 'normal');
            const valueLines = pdf.splitTextToSize(value, contentWidth - tabSpacing);

            for (let i = 0; i < valueLines.length; i++) {
                if (yPos + lineHeight > pageHeight - margin) {
                    pdf.addPage();
                    yPos = margin;
                }
                pdf.text(valueLines[i], x + tabSpacing, yPos);
                yPos += lineHeight;
            }

            return yPos;
        }

        // Enhanced function to add clickable links in PDF
        function addClickableLink(pdf, text, url, x, y, options = {}) {
            const fontSize = options.fontSize || 11;
            const color = options.color || [0, 0, 255]; // Blue color

            pdf.setFontSize(fontSize);
            pdf.setTextColor(...color);

            // Add clickable text
            pdf.textWithLink(text, x, y, { url: url });

            // Return new Y position
            return y + (fontSize * 0.35) + 2;
        }

        // Generate PDF with async image handling

        async function generatePDF() {
            try {
                // --- PAGE 1: TEXT CONTENT WITH AUTO PAGE BREAKS ---
                let y = margin + 5;

                // Main Title - Centered
                pdf.setFontSize(14);
                pdf.setFont(undefined, 'bold');
                const mainTitle = 'TASK DOCUMENT';
                const mainTitleWidth = pdf.getTextWidth(mainTitle);
                const mainTitleX = (pageWidth - mainTitleWidth) / 2;
                pdf.text(mainTitle, mainTitleX, y);
                y += 8;

                // Generation date - Centered and smaller
                pdf.setFontSize(11);
                pdf.setFont(undefined, 'normal');
                const genDate = `Generated on: ${new Date().toLocaleDateString()}`;
                const genDateWidth = pdf.getTextWidth(genDate);
                const genDateX = (pageWidth - genDateWidth) / 2;
                pdf.text(genDate, genDateX, y);
                y += 8;

                // Line under main title
                y = addHorizontalLine(y);
                y += 8;

                // TASK DETAILS section with page break handling
                y = addContentWithPageBreaks('TASK DETAILS', margin, y, { fontSize: 12, bold: true });
                y += 3;

                y = addKeyValueWithBreaks('Task Name:', taskName, margin, y);
                y += 2;
                y = addKeyValueWithBreaks('Task No:', taskNo, margin, y);
                y += 2;
                y = addKeyValueWithBreaks('Account No:', accountNo, margin, y);
                y += 2;
                y = addKeyValueWithBreaks('Company Name:', companyName, margin, y);
                y += 2;
                y = addKeyValueWithBreaks('Transform No:', transformNo, margin, y);
                y += 2;
                y = addKeyValueWithBreaks('Date:', date, margin, y);
                y += 2;

                // LOCATION section with clickable link if available
                if (locationAddress && locationLat && locationLng) {
                    const mapsWebLink = `https://www.google.com/maps?q=${locationLat},${locationLng}`;
                    const mapsAppLink = `geo:${locationLat},${locationLng}`;

                    y = addKeyValueWithBreaks('Location Address:', locationAddress, margin, y);
                    y += 2;

                    y = addKeyValueWithBreaks('Coordinates:',
                        `Latitude: ${parseFloat(locationLat).toFixed(6)}\nLongitude: ${parseFloat(locationLng).toFixed(6)}`,
                        margin, y
                    );
                    y += 5;

                    // Add clickable map links with better formatting
                    y = checkPageBreak(y, 20);

                    // Add map links in consistent key-value format
                    pdf.setFontSize(11);
                    pdf.setFont(undefined, 'bold');
                    pdf.text('Location Maps:', margin, y);
                    pdf.setFont(undefined, 'normal');

                    // Google Maps link
                    pdf.setTextColor(0, 0, 255);
                    pdf.textWithLink('Google Maps (Mobile)', margin + 60, y, { url: mapsWebLink });
                    y += 10;

                    // Maps App link  
                    //pdf.textWithLink('Maps App (Mobile Devices)', margin + 60, y, { url: mapsAppLink });
                    //y += 10;

                    // Reset text color
                    pdf.setTextColor(0, 0, 0);

                } else if (locationAddress) {
                    y = addKeyValueWithBreaks('Location:', locationAddress, margin, y);
                    y += 3;
                } else {
                    y = addKeyValueWithBreaks('Location:', 'Not Provided', margin, y);
                    y += 8;
                }

                y = addKeyValueWithBreaks('Address:', address, margin, y);
                y += 4;

                // DESCRIPTION section with page break handling
                y = addKeyValueWithBreaks('Description:', description, margin, y, { lineHeight: 8 });
                y += 10;

                // ATTACHMENT SUMMARY section
                y = checkPageBreak(y, 20);
                pdf.setFontSize(12);
                pdf.setFont(undefined, 'bold');
                y = addContentWithPageBreaks('ATTACHMENT SUMMARY', margin, y, { fontSize: 12, bold: true });
                y += 3;

                pdf.setFontSize(11);
                pdf.setFont(undefined, 'normal');

                // Photo status
                if (photoData) {
                    y = addContentWithPageBreaks(' Photo: Attached (see next page)', margin, y);
                    y += 4;
                } else {
                    y = addContentWithPageBreaks(' Photo: Not Attached', margin, y);
                    y += 4;
                }

                // Drawing status
                if (drawingData) {
                    y = addContentWithPageBreaks(' Drawing/Signature: Attached (see next page)', margin, y);
                } else {
                    y = addContentWithPageBreaks(' Drawing/Signature: Not Attached', margin, y);
                }

                // --- PAGE 2: PHOTO ---
                if (photoData) {
                    await addFullPageImage(photoData, 'ATTACHED PHOTO', 'JPEG');
                }

                // --- PAGE 3: DRAWING ---
                if (drawingData) {
                    await addFullPageImage(drawingData, 'DRAWING / SIGNATURE', 'PNG');
                }

                pdf.save(`Task-Document-${taskNo}.pdf`);
            } catch (err) {
                console.error('PDF generation error:', err);
                alert('Error generating PDF. Please try again.');
            }
        }

        // Start PDF generation
        generatePDF();
    });


    // Drawing Tool Functionality
    // Canvas setup
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const statusText = document.getElementById('statusText');
    const cursorPosition = document.getElementById('cursorPosition');
    const currentToolDisplay = document.getElementById('currentTool');
    const currentSizeDisplay = document.getElementById('currentSize');
    const brushSize = document.getElementById('brushSize');
    const brushSizeValue = document.getElementById('brushSizeValue');
    const eraserSize = document.getElementById('eraserSize');
    const eraserSizeValue = document.getElementById('eraserSizeValue');
    const eraserOptions = document.getElementById('eraserOptions');
    const customColor = document.getElementById('customColor');
    const savedDrawingImg = document.getElementById('savedDrawingImg');
    const drawingStatus = document.getElementById('drawingStatus');
    const drawingStatusText = document.getElementById('drawingStatusText');
    const deleteStatus = document.getElementById('deleteStatus');
    const deleteStatusText = document.getElementById('deleteStatusText');
    const eraserPreview = document.getElementById('eraserPreview');
    const previewActions = document.getElementById('previewActions');
    const savedDrawingsList = document.getElementById('savedDrawingsList');
    const noSavedDrawings = document.getElementById('noSavedDrawings');
    const toggleSavedDrawings = document.getElementById('toggleSavedDrawings');
    const areaSelection = document.getElementById('areaSelection');

    // Tool buttons
    //const toolButtons = document.querySelectorAll('.tool-btn');
    const penToolButton = document.getElementById('penTool');
    const colorOptions = document.querySelectorAll('.color-option');

    // State variables
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentTool = 'pen';
    let currentColor = '#000000';
    let currentBrushSize = 5;
    let currentEraserSize = 20;
    let startX, startY;
    let savedImageData;
    let savedDrawings = JSON.parse(localStorage.getItem('savedDrawings')) || [];
    let currentSavedDrawingId = null;

    // Area selection variables
    let isSelectingArea = false;
    let selectionStartX, selectionStartY;
    let selectionEndX, selectionEndY;

    // Initialize canvas
    function initCanvas() {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        updateDrawingSettings();
    }

    // Update drawing settings based on current tool and options
    function updateDrawingSettings() {
        if (currentTool === 'eraser') {
            ctx.strokeStyle = 'white';
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = currentEraserSize;
            currentSizeDisplay.textContent = `${currentEraserSize}px`;
        } else {
            ctx.strokeStyle = currentColor;
            ctx.globalCompositeOperation = 'source-over';
            ctx.lineWidth = currentBrushSize;
            currentSizeDisplay.textContent = `${currentBrushSize}px`;
        }
    }

    // Get accurate mouse/touch coordinates relative to canvas
    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        let x, y;

        if (e.type.includes('touch')) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }

        // Scale coordinates based on canvas size vs display size
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return [x * scaleX, y * scaleY];
    }

    // Save drawings to localStorage
    function saveDrawingToStorage(dataURL) {
        const drawing = {
            id: Date.now().toString(),
            dataURL: dataURL,
            name: `Drawing ${savedDrawings.length + 1}`,
            date: new Date().toLocaleString()
        };

        savedDrawings.push(drawing);
        localStorage.setItem('savedDrawings', JSON.stringify(savedDrawings));

        return drawing.id;
    }

    // Delete drawing from storage
    function deleteDrawingFromStorage(id) {
        savedDrawings = savedDrawings.filter(drawing => drawing.id !== id);
        localStorage.setItem('savedDrawings', JSON.stringify(savedDrawings));

        // If we deleted the currently displayed drawing, hide it
        if (currentSavedDrawingId === id) {
            savedDrawingImg.style.display = 'none';
            previewActions.style.display = 'none';
            currentSavedDrawingId = null;
        }

        updateSavedDrawingsList();
    }

    // Update the saved drawings list
    function updateSavedDrawingsList() {
        savedDrawingsList.innerHTML = '';

        if (savedDrawings.length === 0) {
            noSavedDrawings.style.display = 'block';
            return;
        }

        noSavedDrawings.style.display = 'none';

        savedDrawings.forEach(drawing => {
            const drawingItem = document.createElement('div');
            drawingItem.className = 'saved-drawing-item';
            drawingItem.innerHTML = `
                        <img src="${drawing.dataURL}" class="saved-drawing-thumb" alt="Drawing thumbnail">
                        <div class="saved-drawing-info">
                            <div class="saved-drawing-name">${drawing.name}</div>
                            <div class="saved-drawing-date">${drawing.date}</div>
                        </div>
                        <div class="saved-drawing-actions">
                            <button class="btn btn-sm btn-outline-primary view-drawing" data-id="${drawing.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-drawing" data-id="${drawing.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
            savedDrawingsList.appendChild(drawingItem);
        });

        // Add event listeners to the new buttons
        document.querySelectorAll('.view-drawing').forEach(button => {
            button.addEventListener('click', function () {
                const id = this.getAttribute('data-id');
                const drawing = savedDrawings.find(d => d.id === id);
                if (drawing) {
                    savedDrawingImg.src = drawing.dataURL;
                    savedDrawingImg.style.display = 'block';
                    previewActions.style.display = 'flex';
                    currentSavedDrawingId = id;
                    savedDrawingsList.style.display = 'none';
                }
            });
        });

        document.querySelectorAll('.delete-drawing').forEach(button => {
            button.addEventListener('click', function () {
                const id = this.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this drawing?')) {
                    deleteDrawingFromStorage(id);

                    // Show delete success message
                    deleteStatus.style.display = 'block';
                    deleteStatusText.textContent = 'Drawing deleted successfully!';

                    // Hide message after 3 seconds
                    setTimeout(() => {
                        deleteStatus.style.display = 'none';
                    }, 3000);

                    statusText.textContent = 'Drawing deleted';
                }
            });
        });
    }

    // Area selection functionality
    function startAreaSelection(e) {
        isSelectingArea = true;
        const [x, y] = getCoordinates(e);
        selectionStartX = x;
        selectionStartY = y;

        // Show selection rectangle
        areaSelection.style.display = 'block';
        updateAreaSelection(x, y, x, y);

        statusText.textContent = 'Drag to select area to clear';
    }

    function updateAreaSelection(startX, startY, endX, endY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / canvas.width;
        const scaleY = rect.height / canvas.height;

        const x = Math.min(startX, endX) * scaleX;
        const y = Math.min(startY, endY) * scaleY;
        const width = Math.abs(endX - startX) * scaleX;
        const height = Math.abs(endY - startY) * scaleY;

        areaSelection.style.left = `${x}px`;
        areaSelection.style.top = `${y}px`;
        areaSelection.style.width = `${width}px`;
        areaSelection.style.height = `${height}px`;
    }

    function clearSelectedArea() {
        if (!isSelectingArea) return;

        const x = Math.min(selectionStartX, selectionEndX);
        const y = Math.min(selectionStartY, selectionEndY);
        const width = Math.abs(selectionEndX - selectionStartX);
        const height = Math.abs(selectionEndY - selectionStartY);

        // Clear the selected area
        ctx.clearRect(x, y, width, height);

        // Reset area selection
        isSelectingArea = false;
        areaSelection.style.display = 'none';

        statusText.textContent = 'Selected area cleared';
    }

    // Set up event listeners
    function setupEventListeners() {
        // Mouse events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        // Touch events for mobile devices
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', stopDrawing);

        // Track cursor position and show eraser preview
        canvas.addEventListener('mousemove', updateCursorPosition);
        canvas.addEventListener('touchmove', updateCursorPosition);

        // Brush size
        brushSize.addEventListener('input', function () {
            currentBrushSize = this.value;
            brushSizeValue.textContent = `${currentBrushSize}px`;
            if (currentTool !== 'eraser') {
                updateDrawingSettings();
            }
        });

        // Eraser size
        eraserSize.addEventListener('input', function () {
            currentEraserSize = this.value;
            eraserSizeValue.textContent = `${currentEraserSize}px`;
            if (currentTool === 'eraser') {
                updateDrawingSettings();
            }
        });

        // Custom color
        customColor.addEventListener('input', function () {
            currentColor = this.value;
            updateDrawingSettings();

            // Update active color in palette
            colorOptions.forEach(option => {
                option.classList.remove('active');
            });
        });

        // Tool buttons
        // Tool buttons - UPDATED: Only pen tool now
        penToolButton.addEventListener('click', function () {
            currentTool = 'pen';
            penToolButton.classList.add('active');
            eraserOptions.style.display = 'none';
            updateDrawingSettings();
            statusText.textContent = 'Pen tool selected';
            currentToolDisplay.textContent = 'Pen';
        });

        // Color options
        colorOptions.forEach(option => {
            option.addEventListener('click', function () {
                colorOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                currentColor = this.getAttribute('data-color');
                customColor.value = currentColor;
                updateDrawingSettings();
            });
        });

        // Action buttons
        document.getElementById('startDrawing').addEventListener('click', function () {
        currentTool = 'pen';
        penToolButton.classList.add('active');
        eraserOptions.style.display = 'none';
        updateDrawingSettings();
        statusText.textContent = 'Pen tool selected';
        currentToolDisplay.textContent = 'Pen';
    });

        document.getElementById('eraserBtn').addEventListener('click', function () {
        currentTool = 'eraser';
        penToolButton.classList.remove('active');
        eraserOptions.style.display = 'block';
        updateDrawingSettings();
        statusText.textContent = 'Eraser tool selected';
        currentToolDisplay.textContent = 'Eraser';
    });

        document.getElementById('clearDrawing').addEventListener('click', function () {
            if (confirm('Are you sure you want to clear the canvas?')) {
                initCanvas();
                statusText.textContent = 'Canvas cleared';
            }
        });

        // Clear Area button functionality
        document.getElementById('clearAreaBtn').addEventListener('click', function () {
            // Enable area selection mode
            isSelectingArea = true;
            statusText.textContent = 'Click and drag to select area to clear';

            // Add temporary event listeners for area selection
            const areaSelectionMouseDown = function (e) {
                if (!isSelectingArea) return;
                startAreaSelection(e);
            };

            const areaSelectionMouseMove = function (e) {
                if (!isSelectingArea) return;
                const [x, y] = getCoordinates(e);
                selectionEndX = x;
                selectionEndY = y;
                updateAreaSelection(selectionStartX, selectionStartY, x, y);
            };

            const areaSelectionMouseUp = function (e) {
                if (!isSelectingArea) return;
                clearSelectedArea();

                // Remove temporary event listeners
                canvas.removeEventListener('mousedown', areaSelectionMouseDown);
                canvas.removeEventListener('mousemove', areaSelectionMouseMove);
                canvas.removeEventListener('mouseup', areaSelectionMouseUp);
                isSelectingArea = false;
            };

            canvas.addEventListener('mousedown', areaSelectionMouseDown);
            canvas.addEventListener('mousemove', areaSelectionMouseMove);
            canvas.addEventListener('mouseup', areaSelectionMouseUp);
        });

        document.getElementById('saveDrawing').addEventListener('click', function () {
            // Save the current drawing as an image
            const dataURL = canvas.toDataURL('image/png');
            const drawingId = saveDrawingToStorage(dataURL);

            // Update the preview
            savedDrawingImg.src = dataURL;
            savedDrawingImg.style.display = 'block';
            previewActions.style.display = 'flex';
            currentSavedDrawingId = drawingId;

            // Update the saved drawings list
            updateSavedDrawingsList();

            // Show success message
            drawingStatus.style.display = 'block';
            drawingStatusText.textContent = 'Drawing saved successfully!';

            // Hide message after 3 seconds
            setTimeout(() => {
                drawingStatus.style.display = 'none';
            }, 3000);

            statusText.textContent = 'Drawing saved';
        });

        document.getElementById('deleteSavedDrawing').addEventListener('click', function () {
            if (savedDrawings.length === 0) {
                alert('No saved drawings to delete.');
                return;
            }

            if (confirm('Are you sure you want to delete all saved drawings?')) {
                savedDrawings = [];
                localStorage.removeItem('savedDrawings');
                updateSavedDrawingsList();

                // Hide the current preview
                savedDrawingImg.style.display = 'none';
                previewActions.style.display = 'none';
                currentSavedDrawingId = null;

                // Show delete success message
                deleteStatus.style.display = 'block';
                deleteStatusText.textContent = 'All drawings deleted successfully!';

                // Hide message after 3 seconds
                setTimeout(() => {
                    deleteStatus.style.display = 'none';
                }, 3000);

                statusText.textContent = 'All drawings deleted';
            }
        });

        document.getElementById('deleteCurrentDrawing').addEventListener('click', function () {
            if (!currentSavedDrawingId) {
                alert('No drawing selected to delete.');
                return;
            }

            if (confirm('Are you sure you want to delete this drawing?')) {
                deleteDrawingFromStorage(currentSavedDrawingId);

                // Show delete success message
                deleteStatus.style.display = 'block';
                deleteStatusText.textContent = 'Drawing deleted successfully!';

                // Hide message after 3 seconds
                setTimeout(() => {
                    deleteStatus.style.display = 'none';
                }, 3000);

                statusText.textContent = 'Drawing deleted';
            }
        });

        document.getElementById('loadCurrentDrawing').addEventListener('click', function () {
            if (!currentSavedDrawingId) {
                alert('No drawing selected to load.');
                return;
            }

            const drawing = savedDrawings.find(d => d.id === currentSavedDrawingId);
            if (drawing) {
                const img = new Image();
                img.onload = function () {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    statusText.textContent = 'Drawing loaded to canvas';
                };
                img.src = drawing.dataURL;
            }
        });

        toggleSavedDrawings.addEventListener('click', function () {
            if (savedDrawingsList.style.display === 'block') {
                savedDrawingsList.style.display = 'none';
                this.innerHTML = '<i class="fas fa-list"></i> View All Saved';
            } else {
                savedDrawingsList.style.display = 'block';
                this.innerHTML = '<i class="fas fa-times"></i> Hide List';
            }
        });
    }

    // Update cursor position display and eraser preview
    function updateCursorPosition(e) {
        const [x, y] = getCoordinates(e);
        cursorPosition.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;

        // Show eraser preview when using eraser tool
        if (currentTool === 'eraser') {
            const rect = canvas.getBoundingClientRect();
            eraserPreview.style.display = 'block';
            eraserPreview.style.width = `${currentEraserSize}px`;
            eraserPreview.style.height = `${currentEraserSize}px`;
            eraserPreview.style.left = `${e.clientX - rect.left - currentEraserSize / 2}px`;
            eraserPreview.style.top = `${e.clientY - rect.top - currentEraserSize / 2}px`;
        } else {
            eraserPreview.style.display = 'none';
        }
    }

    // Drawing functions
    function startDrawing(e) {
        if (isSelectingArea) return;

        isDrawing = true;
        [lastX, lastY] = getCoordinates(e);
        startX = lastX;
        startY = lastY;

        if (currentTool === 'pen' || currentTool === 'eraser') {
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
        }

        statusText.textContent = 'Drawing...';
    }

    function draw(e) {
        if (!isDrawing || isSelectingArea) return;

        e.preventDefault();

        const [x, y] = getCoordinates(e);

        if (currentTool === 'pen' || currentTool === 'eraser') {
            ctx.lineTo(x, y);
            ctx.stroke();
            [lastX, lastY] = [x, y];
        }
    }

    function stopDrawing() {
        if (!isDrawing || isSelectingArea) return;

        isDrawing = false;
        statusText.textContent = `${currentTool.charAt(0).toUpperCase() + currentTool.slice(1)} tool selected`;
    }

    // Touch event handlers
    function handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }

    function handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }

    // Initialize the drawing tool
    initCanvas();
    setupEventListeners();
    updateSavedDrawingsList();
    savedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);


});



