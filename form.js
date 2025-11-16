document.addEventListener('DOMContentLoaded', function () {


  // === GPS modal bridge (gps.html -> parent form) ===
  const gpsModal = new bootstrap.Modal(document.getElementById('gpsModal'));
  const openGpsModalBtn = document.getElementById('openGpsModal');
  const taskLocationInput = document.getElementById('taskLocation');
  const coordsInput = document.getElementById('coordinatesLink');

  openGpsModalBtn.addEventListener('click', () => {
    gpsModal.show();
  });

  // Listen for result from gps.html iframe
  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type === 'gps:result') {
      // Fill the form fields
      const addr = data.address && data.address !== '—'
        ? data.address
        : `${data.lat.toFixed(7)}, ${data.lng.toFixed(7)} (±${Math.round(data.acc)} m)`;

      taskLocationInput.value = addr;
      taskLocationInput.setAttribute('data-latitude', data.lat);
      taskLocationInput.setAttribute('data-longitude', data.lng);
      taskLocationInput.setAttribute('data-full-address', addr);

      // Google Maps link field
      coordsInput.value = data.mapsUrl;

      // Close modal
      gpsModal.hide();
    }
  });



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
          pdf.textWithLink('Google Maps (Web Browser)', margin + 60, y, { url: mapsWebLink });
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


        // Ask user for a file name before saving
        let defaultName = `Task-Document-${taskNo || 'No'}`.trim();
        let userName = prompt('Enter a file name for the PDF:', defaultName);

        // If user cancels or leaves empty, fall back to default
        if (!userName || !userName.trim()) {
          userName = defaultName;
        } else {
          userName = userName.trim();
        }

        // Ensure .pdf extension
        if (!userName.toLowerCase().endsWith('.pdf')) {
          userName += '.pdf';
        }

        pdf.save(userName);


        // Show success message
        const successBox = document.getElementById('downloadSuccess');
        if (successBox) {
          successBox.style.display = 'block';

          // Hide after 3 seconds
          setTimeout(() => {
            successBox.style.display = 'none';
          }, 3000);
        }


      } catch (err) {
        console.error('PDF generation error:', err);
        alert('Error generating PDF. Please try again.');
      }
    }

    // Start PDF generation
    generatePDF();
  });


  // In the Drawing Tool Functionality section, replace the entire section with this corrected version:

  // === Drawing Tool Functionality (FIXED) ===

  // Canvas setup
  const canvas = document.getElementById('drawingCanvas');
  const ctx = canvas.getContext('2d');
  const statusText = document.getElementById('statusText');
  const cursorPosition = document.getElementById('cursorPosition');
  const currentToolDisplay = document.getElementById('currentTool');
  const currentSizeDisplay = document.getElementById('currentSize');
  const brushSize = document.getElementById('brushSize');
  const brushSizeValue = document.getElementById('brushSizeValue');
  const customColor = document.getElementById('customColor');
  const savedDrawingImg = document.getElementById('savedDrawingImg');
  const drawingStatus = document.getElementById('drawingStatus');
  const drawingStatusText = document.getElementById('drawingStatusText');
  const deleteStatus = document.getElementById('deleteStatus');
  const deleteStatusText = document.getElementById('deleteStatusText');
  const previewActions = document.getElementById('previewActions');
  const savedDrawingsList = document.getElementById('savedDrawingsList');
  const noSavedDrawings = document.getElementById('noSavedDrawings');
  const toggleSavedDrawings = document.getElementById('toggleSavedDrawings');

  // Tool buttons
  const toolButtons = document.querySelectorAll('.tool-btn');
  const colorOptions = document.querySelectorAll('.color-option');

  // State variables
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let currentTool = 'pen';
  let currentColor = '#000000';
  let currentBrushSize = 5;
  let savedDrawings = JSON.parse(localStorage.getItem('savedDrawings')) || [];
  let currentSavedDrawingId = null;

  // Initialize canvas
  function initCanvas() {
    // Set display size
    canvas.style.width = '100%';
    canvas.style.height = '500px';

    // Set actual pixel size to match
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // White background
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    canvas.style.backgroundColor = 'white';

    updateDrawingSettings();
    statusText.textContent = 'Ready to draw';
  }

  // Update drawing settings based on current tool and options
  function updateDrawingSettings() {
    ctx.globalCompositeOperation = 'source-over'; // always normal pen mode
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentBrushSize;
    currentSizeDisplay.textContent = `${currentBrushSize}px`;
    currentToolDisplay.textContent = 'Pen';
  }

  // Get accurate mouse/touch coordinates relative to canvas
  function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;

    if (e.type.includes('touch')) {
      const touch = e.touches[0] || e.changedTouches[0];
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return [x * scaleX, y * scaleY];
  }

  // Save drawing in localStorage
  function saveDrawingToStorage(dataURL) {
    const drawing = {
      id: Date.now().toString(),
      dataURL,
      name: `Drawing ${savedDrawings.length + 1}`,
      date: new Date().toLocaleString()
    };

    savedDrawings.push(drawing);
    localStorage.setItem('savedDrawings', JSON.stringify(savedDrawings));
    return drawing.id;
  }

  // Delete one drawing from localStorage
  function deleteDrawingFromStorage(id) {
    savedDrawings = savedDrawings.filter(d => d.id !== id);
    localStorage.setItem('savedDrawings', JSON.stringify(savedDrawings));

    if (currentSavedDrawingId === id) {
      savedDrawingImg.style.display = 'none';
      previewActions.style.display = 'none';
      currentSavedDrawingId = null;
    }

    updateSavedDrawingsList();
  }

  // Update saved drawings list UI
  function updateSavedDrawingsList() {
    savedDrawingsList.innerHTML = '';

    if (savedDrawings.length === 0) {
      noSavedDrawings.style.display = 'block';
      return;
    }

    noSavedDrawings.style.display = 'none';

    savedDrawings.forEach(drawing => {
      const item = document.createElement('div');
      item.className = 'saved-drawing-item';
      item.innerHTML = `
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
      savedDrawingsList.appendChild(item);
    });

    // View buttons
    savedDrawingsList.querySelectorAll('.view-drawing').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        const drawing = savedDrawings.find(d => d.id === id);
        if (!drawing) return;

        savedDrawingImg.src = drawing.dataURL;
        savedDrawingImg.style.display = 'block';
        previewActions.style.display = 'flex';
        currentSavedDrawingId = id;
        savedDrawingsList.style.display = 'none';
        toggleSavedDrawings.innerHTML = '<i class="fas fa-list"></i> View All Saved';
      });
    });

    // Delete buttons
    savedDrawingsList.querySelectorAll('.delete-drawing').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        if (!confirm('Are you sure you want to delete this drawing?')) return;

        deleteDrawingFromStorage(id);
        deleteStatus.style.display = 'block';
        deleteStatusText.textContent = 'Drawing deleted successfully!';

        setTimeout(() => {
          deleteStatus.style.display = 'none';
        }, 3000);

        statusText.textContent = 'Drawing deleted';
      });
    });
  }

  // Cursor position
  function updateCursorPosition(e) {
    const [x, y] = getCoordinates(e);
    cursorPosition.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
  }

  // Drawing handlers
  function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    [lastX, lastY] = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    statusText.textContent = 'Drawing...';
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();

    const [x, y] = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    [lastX, lastY] = [x, y];
  }

  function stopDrawing(e) {
    if (!isDrawing) return;
    e && e.preventDefault();
    isDrawing = false;
    statusText.textContent = 'Ready to draw';
  }

  // Touch → mouse mapping for consistent behavior
  function handleTouchStart(e) {
    startDrawing(e);
  }

  function handleTouchMove(e) {
    draw(e);
    updateCursorPosition(e);
  }

  function handleTouchEnd(e) {
    stopDrawing(e);
  }

  // Set up event listeners
  function setupEventListeners() {
    // Canvas mouse
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', (e) => {
      draw(e);
      updateCursorPosition(e);
    });
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Canvas touch
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Brush size
    brushSize.addEventListener('input', function () {
      currentBrushSize = parseInt(this.value, 10);
      brushSizeValue.textContent = `${currentBrushSize}px`;
      updateDrawingSettings();
    });

    // Custom color
    customColor.addEventListener('input', function () {
      currentColor = this.value;
      updateDrawingSettings();
      colorOptions.forEach(opt => opt.classList.remove('active'));
    });

    // Tool buttons (only Pen for now, but kept generic)
    toolButtons.forEach(button => {
      button.addEventListener('click', function () {
        const tool = this.getAttribute('data-tool');
        if (!tool) return;

        toolButtons.forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');

        currentTool = tool; // only 'pen' currently
        updateDrawingSettings();
        statusText.textContent = 'Pen tool selected';
      });
    });

    // Color palette
    colorOptions.forEach(option => {
      option.addEventListener('click', function () {
        colorOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        currentColor = this.getAttribute('data-color');
        customColor.value = currentColor;
        updateDrawingSettings();
      });
    });

    // Clear canvas
    document.getElementById('clearDrawing').addEventListener('click', function () {
      if (!confirm('Are you sure you want to clear the canvas?')) return;
      initCanvas();
      statusText.textContent = 'Canvas cleared';
    });

    // Save drawing
    document.getElementById('saveDrawing').addEventListener('click', function () {
      const dataURL = canvas.toDataURL('image/png');
      const id = saveDrawingToStorage(dataURL);

      savedDrawingImg.src = dataURL;
      savedDrawingImg.style.display = 'block';
      previewActions.style.display = 'flex';
      currentSavedDrawingId = id;

      updateSavedDrawingsList();

      drawingStatus.style.display = 'block';
      drawingStatusText.textContent = 'Drawing saved successfully!';
      setTimeout(() => {
        drawingStatus.style.display = 'none';
      }, 3000);

      statusText.textContent = 'Drawing saved';
    });

    // Delete ALL saved drawings
    document.getElementById('deleteSavedDrawing').addEventListener('click', function () {
      if (savedDrawings.length === 0) {
        alert('No saved drawings to delete.');
        return;
      }
      if (!confirm('Are you sure you want to delete all saved drawings?')) return;

      savedDrawings = [];
      localStorage.removeItem('savedDrawings');
      updateSavedDrawingsList();

      savedDrawingImg.style.display = 'none';
      previewActions.style.display = 'none';
      currentSavedDrawingId = null;

      deleteStatus.style.display = 'block';
      deleteStatusText.textContent = 'All drawings deleted successfully!';
      setTimeout(() => {
        deleteStatus.style.display = 'none';
      }, 3000);

      statusText.textContent = 'All drawings deleted';
    });

    // Delete CURRENT drawing
    document.getElementById('deleteCurrentDrawing').addEventListener('click', function () {
      if (!currentSavedDrawingId) {
        alert('No drawing selected to delete.');
        return;
      }
      if (!confirm('Are you sure you want to delete this drawing?')) return;

      deleteDrawingFromStorage(currentSavedDrawingId);

      deleteStatus.style.display = 'block';
      deleteStatusText.textContent = 'Drawing deleted successfully!';
      setTimeout(() => {
        deleteStatus.style.display = 'none';
      }, 3000);

      statusText.textContent = 'Drawing deleted';
    });

    // Toggle saved drawings list
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

  // Initialize drawing tool
  function initializeDrawingTool() {
    initCanvas();
    setupEventListeners();
    updateSavedDrawingsList();

    if (savedDrawings.length > 0) {
      const first = savedDrawings[0];
      savedDrawingImg.src = first.dataURL;
      savedDrawingImg.style.display = 'block';
      previewActions.style.display = 'flex';
      currentSavedDrawingId = first.id;
    }
  }

  // Call at end of DOMContentLoaded
  initializeDrawingTool();




  // if ('serviceWorker' in navigator) {
  //   window.addEventListener('load', async () => {
  //     try {
  //       const reg = await navigator.serviceWorker.register('./sw.js');

  //       const activateNow = (sw) => sw && sw.postMessage({ type: 'SKIP_WAITING' });

  //       if (reg.waiting) activateNow(reg.waiting);

  //       reg.addEventListener('updatefound', () => {
  //         const newSW = reg.installing;
  //         if (!newSW) return;
  //         newSW.addEventListener('statechange', () => {
  //           if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
  //             activateNow(newSW);
  //           }
  //         });
  //       });

  //       navigator.serviceWorker.addEventListener('controllerchange', () => {
  //         // avoid any chance of reload loops
  //         if (!window.__swReloaded) {
  //           window.__swReloaded = true;
  //           window.location.reload();
  //         }
  //       });
  //     } catch (err) {
  //       console.error('SW registration failed:', err);
  //     }
  //   });
  // }


});