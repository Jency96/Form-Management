/* ============================
   Final form.js - Full App
   (offline-ready, preview + rename modal,
    camera, drawing, location, PDF download)
   ============================ */

/* ---------------------------
   Service Worker registration
   --------------------------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('✅ Service Worker registered:', reg.scope))
      .catch(err => console.warn('⚠️ Service Worker registration failed:', err));
  });
}

/* ---------------------------
   DOM Ready: initialize everything
   --------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  createRenameModal();         // create rename modal in DOM (Bootstrap)
  initCameraModule();
  initDrawingModule();
  initLocationPicker();
  initPreviewAndDownloadFlow();
});

/* ===================================================================
   Preview & Download flow (Generate preview -> show download -> rename)
   =================================================================== */
function initPreviewAndDownloadFlow() {
  const generateBtn = document.getElementById('generateDoc');
  const downloadBtn = document.getElementById('downloadDoc');
  const previewEl = document.getElementById('documentPreview');

  if (!generateBtn || !previewEl || !downloadBtn) {
    console.warn('Preview/download elements missing');
    return;
  }

  generateBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Build preview
    buildDocumentPreview();

    // Show download button
    downloadBtn.style.display = 'block';
    downloadBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Download button opens rename modal
  // Replace the existing downloadBtn.addEventListener('click', ...) block with:
  downloadBtn.addEventListener('click', () => {
    // Ensure the modal exists (it’s created on DOMContentLoaded)
    createRenameModal();

    // Optionally prefill the filename
    const taskNo = document.getElementById('taskNo')?.value || '';
    const defaultName = `Task-Document-${taskNo || 'Unknown'}.pdf`;
    const fileInput = document.getElementById('fileNameInput');
    if (fileInput) fileInput.value = defaultName;

    // Show the modal
    const modalEl = document.getElementById('renameModal');
    const modal = new bootstrap.Modal(modalEl, { backdrop: 'static' });
    modal.show();
  });

}

/* ---------------------------
   Build HTML Document Preview
   --------------------------- */
function buildDocumentPreview() {
  const previewEl = document.getElementById('documentPreview');
  if (!previewEl) return;

  // Collect form fields
  const taskName = sanitizeText('taskName');
  const taskNo = sanitizeText('taskNo');
  const accountNo = sanitizeText('accountNo');
  const companyName = sanitizeText('companyName');
  const transformNo = sanitizeText('transformNo');
  const dateValue = sanitizeText('date');
  const locationValue = sanitizeText('taskLocation');
  const address = sanitizeText('address');
  const description = sanitizeText('description');
  const lat = document.getElementById('latitudeValue')?.textContent || '';
  const lng = document.getElementById('longitudeValue')?.textContent || '';

  // Photo & drawing preview sources
  const photoPreview = document.getElementById('photoPreview');
  const capturedPhoto = document.getElementById('capturedPhoto');
  let photoSrc = '';
  if (photoPreview && photoPreview.src) photoSrc = photoPreview.src;
  if (!photoSrc && capturedPhoto && capturedPhoto.src) photoSrc = capturedPhoto.src;

  const drawingCanvas = document.getElementById('drawingCanvas');
  // after (gate on actual content)
  let drawingSrc = (drawingCanvas && window.__drawingHasContent && window.__drawingHasContent())
    ? drawingCanvas.toDataURL('image/png')
    : '';

  // Build HTML preview (simple but styled)
  const html = `
    <div class="card p-3">
      <h3 class="text-center mb-2">TASK DOCUMENT</h3>
      <p class="text-center text-muted">Generated on: ${new Date().toLocaleDateString()}</p>
      <hr />
      <h5>TASK DETAILS</h5>
      <div class="row">
        <div class="col-6"><strong>Task Name:</strong> ${taskName || '<em>Not provided</em>'}</div>
        <div class="col-6"><strong>Task No:</strong> ${taskNo || '<em>Not provided</em>'}</div>
      </div>
      <div class="row mt-2">
        <div class="col-6"><strong>Account No:</strong> ${accountNo || '<em>Not provided</em>'}</div>
        <div class="col-6"><strong>Company Name:</strong> ${companyName || '<em>Not provided</em>'}</div>
      </div>
      <div class="row mt-2">
        <div class="col-6"><strong>Transform No:</strong> ${transformNo || '<em>Not provided</em>'}</div>
        <div class="col-6"><strong>Date:</strong> ${dateValue || '<em>Not provided</em>'}</div>
      </div>

      <div>
        <strong>Location:</strong> ${locationValue || '<em>Not provided</em>'}
      </div>
      ${(lat && lng)
        
            ? `<div class="mt-1">
            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary">
              <i class="fas fa-map-marker-alt"></i> View on Google Maps
            </a>
          </div>`
            : ''
          }
      <div><strong>Coordinates:</strong> ${lat && lng ? `${lat}, ${lng}` : '<em>Not provided</em>'}</div>

      <h5 class="mt-3">Address</h5>
      <div>${address || '<em>Not provided</em>'}</div>

      <h5 class="mt-3">Description</h5>
      <div>${description || '<em>Not provided</em>'}</div>

      <h5 class="mt-3">Attachments</h5>
      <div class="row">
        <div class="col-6 text-center">
          <strong>Photo</strong><br />
          ${photoSrc ? `<img src="${photoSrc}" alt="Photo" style="max-width:100%; max-height:200px; border:1px solid #ccc;" />` : '<em>No photo attached</em>'}
        </div>
        <div class="col-6 text-center">
          <strong>Drawing</strong><br />
          ${drawingSrc ? `<img src="${drawingSrc}" alt="Drawing" style="max-width:100%; max-height:200px; border:1px solid #ccc;" />` : '<em>No drawing attached</em>'}
        </div>
      </div>
    </div>
  `;

  previewEl.innerHTML = html;
}

/* ---------------------------
   Rename Modal creation (Bootstrap)
   Creates an element with id="renameModal" and wiring
   --------------------------- */
function createRenameModal() {
  // Prevent duplicate modals
  if (document.getElementById('renameModal')) return;

  // Create the modal HTML
  const modalHtml = `
    <div class="modal fade" id="renameModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Save Document As</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <label for="fileNameInput" class="form-label">File name</label>
            <input type="text" id="fileNameInput" class="form-control" placeholder="Enter file name" />
            <div class="form-text mt-2">You can change the file name before downloading.</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" id="confirmDownloadBtn" class="btn btn-primary">Download</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Add event listener for the confirm button inside the modal
  document.getElementById('confirmDownloadBtn')?.addEventListener('click', async () => {
    const input = document.getElementById('fileNameInput');
    const name = (input?.value || `Task-Document-${Date.now()}`).trim();

    // Remove focus (optional cosmetic fix)
    if (document.activeElement) document.activeElement.blur();

    // Hide the modal safely
    const modalEl = document.getElementById('renameModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    // Wait for the closing animation, then start the download
    setTimeout(async () => {
      await generatePdfAndDownload(name);
    }, 300);
  });
}


/* ===================================================================
   PDF generation (creates PDF from form values + attachments) and download
   - uses jsPDF safely
   - alerts: Generating / Download started / Download completed
   =================================================================== */
async function generatePdfAndDownload(filename) {
  try {
    // safe jsPDF access
    const jsPDFConstructor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF || null;
    if (!jsPDFConstructor) {
      alert('PDF library not loaded. Please open app online once so library can cache, then try again.');
      return;
    }

    const pdf = new jsPDFConstructor('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = pdf.internal.pageSize.getWidth();

    // Collect form values same as preview
    const taskName = sanitizeText('taskName');
    const taskNo = sanitizeText('taskNo');
    const accountNo = sanitizeText('accountNo');
    const companyName = sanitizeText('companyName');
    const transformNo = sanitizeText('transformNo');
    const dateValue = sanitizeText('date');
    const locationValue = sanitizeText('taskLocation');
    const address = sanitizeText('address');
    const description = sanitizeText('description');
    const lat = document.getElementById('latitudeValue')?.textContent || '';
    const lng = document.getElementById('longitudeValue')?.textContent || '';

    // Photo and drawing data
    let photoSrc = document.getElementById('photoPreview')?.src || document.getElementById('capturedPhoto')?.src || '';
    if (photoSrc && photoSrc.includes('data:,')) photoSrc = ''; // ignore empty
    const drawingCanvas = document.getElementById('drawingCanvas');

    // after (gate on actual content)
    const drawingData = (drawingCanvas && window.__drawingHasContent && window.__drawingHasContent())
      ? drawingCanvas.toDataURL('image/png')
      : '';

    // Build PDF page 1
    let y = margin + 5;
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    const title = 'TASK DOCUMENT';
    pdf.text(title, (pageWidth - pdf.getTextWidth(title)) / 2, y);
    y += 8;

    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    const genDate = `Generated on: ${new Date().toLocaleDateString()}`;
    pdf.text(genDate, (pageWidth - pdf.getTextWidth(genDate)) / 2, y);
    y += 8;

    y = addHorizontalLine(pdf, y);
    y += 8;

    y = addContent(pdf, 'TASK DETAILS', margin, y, { bold: true });
    y = addKeyValue(pdf, 'Task Name:', taskName, margin, y);
    y = addKeyValue(pdf, 'Task No:', taskNo, margin, y);
    y = addKeyValue(pdf, 'Account No:', accountNo, margin, y);
    y = addKeyValue(pdf, 'Company Name:', companyName, margin, y);
    y = addKeyValue(pdf, 'Transform No:', transformNo, margin, y);
    y = addKeyValue(pdf, 'Date:', dateValue, margin, y);

    if (locationValue || (lat && lng)) {

      // Output Location
      y = addKeyValue(pdf, 'Location:', locationValue || 'Selected via map', margin, y);

      // Add Google Maps link on new line if coordinates exist
      if (lat && lng) {
        const mapsWebLink = `https://www.google.com/maps?q=${lat},${lng}`;
        const linkLabel = 'View on Google Maps';

        pdf.setTextColor(0, 0, 255);
        pdf.textWithLink(linkLabel, margin + 50, y, { url: mapsWebLink });
        pdf.setTextColor(0, 0, 0);
        y += 6;
      }

      // --- Coordinates (no link here) ---
      if (lat && lng) {
        y = addKeyValue(
          pdf,
          'Coordinates:',
          `Latitude: ${parseFloat(lat).toFixed(6)} | Longitude: ${parseFloat(lng).toFixed(6)}`,
          margin,
          y
        );
      } else {
        y = addKeyValue(pdf, 'Coordinates:', 'Not provided', margin, y);
      }

    }

    y = addKeyValue(pdf, 'Address:', address, margin, y);
    y = addKeyValue(pdf, 'Description:', description, margin, y + 3);
    y += 8;

    y = addContent(pdf, 'ATTACHMENT SUMMARY', margin, y, { bold: true });
    y = addKeyValue(pdf, 'Photo:', photoSrc ? 'Attached (see next page)' : 'Not attached', margin, y);
    y = addKeyValue(pdf, 'Drawing/Signature:', drawingData ? 'Attached (see next page)' : 'Not attached', margin, y);

    // Add photo page if present
    if (photoSrc) {
      pdf.addPage();
      try {
        const fmt = inferImageFormat(photoSrc);
        await addFullPageImagePdf(pdf, photoSrc, 'ATTACHED PHOTO', fmt);
      } catch (err) {
        console.warn('Failed to add photo to PDF', err);
      }
    }

    // Add drawing page if present
    if (drawingData) {
      pdf.addPage();
      try {
        await addFullPageImagePdf(pdf, drawingData, 'DRAWING / SIGNATURE', 'PNG');
      } catch (err) {
        console.warn('Failed to add drawing to PDF', err);
      }
    }

    // Download via blob with alerts
    alert('📄 Generating your PDF, please wait...');
    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);

    alert('✅ Download started. Your PDF will appear shortly.');

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Task-Document-${Date.now()}.pdf`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // cleanup and completed alert
    setTimeout(() => {
      URL.revokeObjectURL(url);
      alert('✅ Download completed successfully! Check your Downloads folder.');
    }, 1200);

  } catch (err) {
    console.error('PDF generation error:', err);
    alert('❌ Error generating PDF. Please try again.');
  }
}

/* ===========================================================================
   Camera module (uses Modal from HTML)
   IDs referenced: takePhoto, cameraModal, cameraPreview, photoCanvas, capturedPhoto,
                   captureBtn, retakeBtn, usePhotoBtn, photoStatus, photoStatusText
   =========================================================================== */
function initCameraModule() {
  const openCameraBtn = document.getElementById('takePhoto');
  const cameraModalEl = document.getElementById('cameraModal');
  const previewVideo = document.getElementById('cameraPreview');
  const photoCanvas = document.getElementById('photoCanvas');
  const capturedPhoto = document.getElementById('capturedPhoto');
  const captureBtn = document.getElementById('captureBtn');
  const retakeBtn = document.getElementById('retakeBtn');
  const usePhotoBtn = document.getElementById('usePhotoBtn');
  const photoStatus = document.getElementById('photoStatus');
  const photoStatusText = document.getElementById('photoStatusText');

  if (!openCameraBtn || !cameraModalEl || !previewVideo || !photoCanvas || !capturedPhoto) {
    console.warn('Camera elements missing, camera module not initialized');
    return;
  }

  const cameraModal = new bootstrap.Modal(cameraModalEl, { backdrop: 'static', keyboard: false });
  let stream = null;

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      previewVideo.srcObject = stream;
      await previewVideo.play();
      // reset UI
      capturedPhoto.parentElement.style.display = 'none';
      previewVideo.style.display = 'block';
      captureBtn.style.display = '';
      retakeBtn.style.display = 'none';
      usePhotoBtn.style.display = 'none';
      cameraModal.show();
    } catch (err) {
      console.error('Camera start error', err);
      alert('Camera not available or permission denied. Please allow camera access and retry (online required for permission prompt).');
    }
  }

  function stopStream() {
    if (!stream) return;
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }

  openCameraBtn.addEventListener('click', (e) => {
    e.preventDefault();
    startCamera();
  });

  captureBtn?.addEventListener('click', () => {
    const vw = previewVideo.videoWidth || previewVideo.clientWidth || 640;
    const vh = previewVideo.videoHeight || previewVideo.clientHeight || 480;
    photoCanvas.width = vw;
    photoCanvas.height = vh;
    const ctx = photoCanvas.getContext('2d');
    ctx.drawImage(previewVideo, 0, 0, vw, vh);
    const data = photoCanvas.toDataURL('image/jpeg', 0.92);
    capturedPhoto.src = data;
    capturedPhoto.parentElement.style.display = 'block';
    previewVideo.style.display = 'none';
    captureBtn.style.display = 'none';
    retakeBtn.style.display = '';
    usePhotoBtn.style.display = '';
    stopStream();
  });

  retakeBtn?.addEventListener('click', () => {
    // reopen camera
    startCamera();
  });

  usePhotoBtn?.addEventListener('click', () => {
    // set #photoPreview (hidden image) for PDF flow
    let photoPreview = document.getElementById('photoPreview');
    if (!photoPreview) {
      photoPreview = document.createElement('img');
      photoPreview.id = 'photoPreview';
      photoPreview.style.display = 'none';
      document.body.appendChild(photoPreview);
    }
    photoPreview.src = capturedPhoto.src || '';
    if (photoStatus) {
      photoStatus.style.display = 'block';
      if (photoStatusText) photoStatusText.textContent = 'Photo ready to attach';
    }
    const modal = bootstrap.Modal.getInstance(cameraModalEl);
    modal?.hide();
  });

  cameraModalEl.addEventListener('hidden.bs.modal', () => stopStream());
}

/* ===========================================================================
   Drawing module
   IDs used: drawingCanvas, startDrawing, clearDrawing, saveDrawing, deleteSavedDrawing,
             brushSize, brushSizeValue, color-option, customColor, savedDrawingImg,
             savedDrawingsList, noSavedDrawings, toggleSavedDrawings, drawingStatus
   =========================================================================== */
function initDrawingModule() {
  const canvas = document.getElementById('drawingCanvas');
  let hasUserDrawn = false;
  if (!canvas) {
    console.warn('Drawing canvas not found');
    return;
  }
  const ctx = canvas.getContext('2d');

  // set canvas full size if attributes present
  if (!canvas.width) canvas.width = canvas.clientWidth || 800;
  if (!canvas.height) canvas.height = canvas.clientHeight || 400;

  // initialize white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let drawing = false;
  let currentColor = '#000000';
  let brushSize = parseInt(document.getElementById('brushSize')?.value || '5', 10);

  let useEraser = false;
  const eraserBtn = document.getElementById('eraserBtn');
  eraserBtn?.addEventListener('click', () => { useEraser = !useEraser; eraserBtn.classList.toggle('btn-warning-beautiful'); });

  const brushRange = document.getElementById('brushSize');
  const brushValue = document.getElementById('brushSizeValue');
  const colorOptions = document.querySelectorAll('.color-option');
  const customColor = document.getElementById('customColor');
  const clearBtn = document.getElementById('clearDrawing');
  const saveBtn = document.getElementById('saveDrawing');
  const savedList = document.getElementById('savedDrawingsList');
  const noSaved = document.getElementById('noSavedDrawings');
  const toggleSaved = document.getElementById('toggleSavedDrawings');
  const savedDrawingImg = document.getElementById('savedDrawingImg');

  brushRange?.addEventListener('input', (e) => {
    brushSize = parseInt(e.target.value, 10);
    if (brushValue) brushValue.textContent = `${brushSize}px`;
  });

  colorOptions?.forEach(opt => {
    opt.addEventListener('click', () => {
      colorOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      currentColor = opt.dataset.color || '#000000';
    });
  });

  customColor?.addEventListener('change', (e) => {
    currentColor = e.target.value;
    colorOptions.forEach(o => o.classList.remove('active'));
  });

  function startDraw(e) {
    drawing = true;
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.moveTo(x, y);
  }
  function moveDraw(e) {
    if (!drawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = useEraser ? '#ffffff' : currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    hasUserDrawn = true;
  }
  function endDraw() {
    drawing = false;
    ctx.closePath();
  }

  // mouse
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', moveDraw);
  window.addEventListener('mouseup', endDraw);

  // touch
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); moveDraw(e); });
  canvas.addEventListener('touchend', (e) => { e.preventDefault(); endDraw(e); });

  clearBtn?.addEventListener('click', () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hasUserDrawn = false; // ✅ reset: now we won't attach a blank image
  });

  saveBtn?.addEventListener('click', () => {
    const data = canvas.toDataURL('image/png');
    const drawings = JSON.parse(localStorage.getItem('saved_drawings') || '[]');
    drawings.push({ id: Date.now(), data });
    localStorage.setItem('saved_drawings', JSON.stringify(drawings));
    showSavedPreview(data);
    showTemporaryMessage('drawingStatus', 'Drawing saved successfully!');
    renderSavedList();
  });

  document.getElementById('deleteSavedDrawing')?.addEventListener('click', () => {
    localStorage.removeItem('saved_drawings');
    renderSavedList();
    showTemporaryMessage('deleteStatus', 'All saved drawings deleted!');
  });

  toggleSaved?.addEventListener('click', () => {
    if (!savedList) return;
    savedList.style.display = savedList.style.display === 'block' ? 'none' : 'block';
  });

  function showSavedPreview(dataUrl) {
    if (!savedDrawingImg) return;
    savedDrawingImg.src = dataUrl;
    savedDrawingImg.style.display = 'block';
  }

  function showTemporaryMessage(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'block';
    const span = el.querySelector('span');
    if (span) span.textContent = msg;
    setTimeout(() => el.style.display = 'none', 2400);
  }

  function renderSavedList() {
    const drawings = JSON.parse(localStorage.getItem('saved_drawings') || '[]');
    if (!savedList) return;
    savedList.innerHTML = '';
    if (!drawings.length) {
      if (noSaved) noSaved.style.display = 'block';
      return;
    }
    if (noSaved) noSaved.style.display = 'none';
    drawings.slice().reverse().forEach(d => {
      const wrapper = document.createElement('div');
      wrapper.className = 'saved-item mb-2';
      wrapper.innerHTML = `<img src="${d.data}" style="max-width:120px; display:block; margin-bottom:6px; border:1px solid #ddd;"/><div class="d-grid gap-1"><button class="btn btn-sm btn-primary load-drawing" data-id="${d.id}">Load</button><button class="btn btn-sm btn-danger delete-drawing" data-id="${d.id}">Delete</button></div>`;
      savedList.appendChild(wrapper);
    });

    // attach handlers
    savedList.querySelectorAll('.load-drawing').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const drawings = JSON.parse(localStorage.getItem('saved_drawings') || '[]');
        const found = drawings.find(x => String(x.id) === String(id));
        if (found) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            hasUserDrawn = true; // ✅ it now contains content
          };
          img.src = found.data;
        }
      });
    });

    savedList.querySelectorAll('.delete-drawing').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        let drawings = JSON.parse(localStorage.getItem('saved_drawings') || '[]');
        drawings = drawings.filter(x => String(x.id) !== String(id));
        localStorage.setItem('saved_drawings', JSON.stringify(drawings));
        renderSavedList();
        showTemporaryMessage('deleteStatus', 'Drawing deleted successfully!');
      });
    });
  }

  // expose a getter for other modules
  window.__drawingHasContent = () => hasUserDrawn;


  // initial render of saved drawings
  renderSavedList();
}

/* ===========================================================================
   Location picker (Leaflet) using IDs from your HTML
   - openLocationPicker, locationPickerModal, map, gpsBtn, confirmLocationBtn,
     locationInput, latitudeValue, longitudeValue, addressLine1, addressLine2, loading
   =========================================================================== */
function initLocationPicker() {
  const openBtn = document.getElementById('openLocationPicker');
  const modalEl = document.getElementById('locationPickerModal');
  const mapContainer = document.getElementById('map');
  const confirmBtn = document.getElementById('confirmLocationBtn');
  const locationInput = document.getElementById('locationInput');
  const searchButton = document.getElementById('searchButton');
  const searchResults = document.getElementById('searchResults');
  const latitudeValue = document.getElementById('latitudeValue');
  const longitudeValue = document.getElementById('longitudeValue');
  const addressLine1 = document.getElementById('addressLine1');
  const addressLine2 = document.getElementById('addressLine2');
  const gpsBtn = document.getElementById('gpsBtn');
  const loadingEl = document.getElementById('loading');

  if (!openBtn || !modalEl || !mapContainer) {
    console.warn('Location picker elements missing - skipping location initialization');
    return;
  }

  let map, marker, mapInitialized = false;
  const locModal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

  openBtn.addEventListener('click', () => {
    locModal.show();
    setTimeout(() => {
      if (!mapInitialized) initMap();
      map.invalidateSize && map.invalidateSize();
    }, 300);
  });

  function initMap() {
    map = L.map('map', { zoomControl: false }).setView([6.9271, 79.8612], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    marker = L.marker(map.getCenter(), { draggable: true }).addTo(map);

    marker.on('moveend', () => {
      const latlng = marker.getLatLng();
      updateLocation(latlng.lat, latlng.lng);
      reverseGeocode(latlng.lat, latlng.lng);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      updateLocation(e.latlng.lat, e.latlng.lng);
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    // Search (Nominatim)
    searchButton?.addEventListener('click', () => {
      const q = (locationInput?.value || '').trim();
      if (!q) return;
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`)
        .then(r => r.json())
        .then(results => {
          searchResults.innerHTML = '';
          results.forEach(r => {
            const div = document.createElement('div');
            div.className = 'search-result';
            div.textContent = r.display_name;
            div.addEventListener('click', () => {
              marker.setLatLng([r.lat, r.lon]);
              map.setView([r.lat, r.lon], 16);
              updateLocation(parseFloat(r.lat), parseFloat(r.lon));
              addressLine1.textContent = r.display_name;
              searchResults.innerHTML = '';
            });
            searchResults.appendChild(div);
          });
        })
        .catch(err => console.warn('Search failed', err));
    });

    gpsBtn?.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation not supported on this device.');
        return;
      }
      loadingEl && (loadingEl.style.display = 'flex');
      navigator.geolocation.getCurrentPosition(pos => {
        loadingEl && (loadingEl.style.display = 'none');
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        const acc = pos.coords.accuracy;
        const accEl = document.getElementById('accuracyValue');
        if (accEl) accEl.textContent = `${Math.round(acc)} m`;

        marker.setLatLng([lat, lng]);
        map.setView([lat, lng], 16);
        updateLocation(lat, lng);
        reverseGeocode(lat, lng);
      }, err => {
        loadingEl && (loadingEl.style.display = 'none');
        alert('Unable to get location: ' + err.message);
      }, { enableHighAccuracy: true, timeout: 10000 });
    });


    // ✅ Add manual zoom button handlers
    document.getElementById('zoomIn')?.addEventListener('click', () => {
      map.setZoom(map.getZoom() + 1);
    });
    document.getElementById('zoomOut')?.addEventListener('click', () => {
      map.setZoom(map.getZoom() - 1);
    });

    mapInitialized = true;
  }

  function updateLocation(lat, lng) {
    if (latitudeValue) latitudeValue.textContent = lat.toFixed(6);
    if (longitudeValue) longitudeValue.textContent = lng.toFixed(6);
    if (addressLine2) addressLine2.textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
  }

  function reverseGeocode(lat, lng) {
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then(r => r.json())
      .then(res => {
        if (res?.display_name && addressLine1) addressLine1.textContent = res.display_name;
      }).catch(err => console.warn('Reverse geocode failed', err));
  }

  confirmBtn?.addEventListener('click', () => {
    const lat = document.getElementById('latitudeValue')?.textContent || '';
    const lng = document.getElementById('longitudeValue')?.textContent || '';
    const addr = document.getElementById('addressLine1')?.textContent || '';
    const taskLocation = document.getElementById('taskLocation');
    if (taskLocation) {
      taskLocation.value = addr || (lat && lng ? `${lat}, ${lng}` : '');
    }
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal?.hide();
  });
}

/* -------------------------------
   Helpers used by preview & PDF
   ------------------------------- */
function sanitizeText(id) {
  const el = document.getElementById(id);
  return el ? (el.value || '').toString().trim().replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
}

function addHorizontalLine(pdf, y) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setLineWidth(0.5);
  pdf.line(15, y, pageWidth - 15, y);
  return y + 4;
}

function addContent(pdf, text, x, y, options = {}) {
  const fontSize = options.fontSize || 12;
  const bold = options.bold || false;
  pdf.setFontSize(fontSize);
  pdf.setFont(undefined, bold ? 'bold' : 'normal');
  pdf.text(text, x, y);
  return y + (fontSize * 0.6) + 4;
}

function addKeyValue(pdf, key, value, x, y) {
  const fontSize = 11;
  pdf.setFontSize(fontSize);
  pdf.setFont(undefined, 'bold');
  pdf.text(key, x, y);
  pdf.setFont(undefined, 'normal');
  const wrapped = pdf.splitTextToSize(value || 'Not provided', pdf.internal.pageSize.getWidth() - (x + 50));
  pdf.text(wrapped, x + 50, y);
  return y + wrapped.length * (fontSize * 0.6) + 6;
}

function inferImageFormat(dataUrl) {
  if (!dataUrl) return 'JPEG';
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg')) return 'JPEG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

/* addFullPageImagePdf: ensures image is added with aspect fit to PDF
   Returns a Promise because image load is asynchronous */
function addFullPageImagePdf(pdf, imgData, title, format) {
  return new Promise((resolve, reject) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    const titleW = pdf.getTextWidth(title || '');
    if (title) pdf.text(title, (pageWidth - titleW) / 2, 18);

    const margin = 15;
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - 50;

    const img = new Image();
    img.onload = function () {
      try {
        const iw = img.width;
        const ih = img.height;
        const scale = Math.min(maxW / iw, maxH / ih, 1);
        const w = iw * scale;
        const h = ih * scale;
        const x = margin + (maxW - w) / 2;
        const y = 28;
        pdf.addImage(imgData, format, x, y, w, h);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = imgData;
  });
}
