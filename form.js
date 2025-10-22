// ============================
// Full App - form.js
// Offline-ready: camera, drawing, location, PDF (with alerts)
// Matches provided index.html element IDs
// ============================

// ---- Service worker registration (uses sw.js as in your index.html) ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('✅ Service Worker registered:', reg.scope))
      .catch(err => console.warn('⚠️ Service Worker registration failed:', err));
  });
}

// ---- DOM ready: wire up UI and init modules ----
document.addEventListener('DOMContentLoaded', () => {
  // Initialize modules
  initCameraModule();
  initDrawingModule();
  initLocationPicker();
  initPdfButtons();
});

/* ------------------------------------------------------------------------
  PDF generation + download (Blob method) with user alerts
-------------------------------------------------------------------------*/
function initPdfButtons() {
  const generateBtn = document.getElementById('generateDoc');
  if (!generateBtn) {
    console.warn('generateDoc button not found');
    return;
  }

  generateBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // generate and download PDF
    await generateAndDownloadPdf();
  });
}

async function generateAndDownloadPdf() {
  try {
    // ensure jsPDF available
    const jsPDFConstructor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF || null;
    if (!jsPDFConstructor) {
      alert('PDF library not loaded. Please open the app once online and refresh, then try again.');
      console.error('jsPDF not found');
      return;
    }

    const pdf = new jsPDFConstructor('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = pdf.internal.pageSize.getWidth();

    // collect form fields (IDs from your HTML)
    const taskName = document.getElementById('taskName')?.value || '';
    const taskNo = document.getElementById('taskNo')?.value || '';
    const accountNo = document.getElementById('accountNo')?.value || '';
    const companyName = document.getElementById('companyName')?.value || '';
    const transformNo = document.getElementById('transformNo')?.value || '';
    const date = document.getElementById('date')?.value || '';
    const locationAddress = document.getElementById('taskLocation')?.value || '';
    const address = document.getElementById('address')?.value || '';
    const description = document.getElementById('description')?.value || '';
    const latitude = document.getElementById('latitudeValue')?.textContent || '';
    const longitude = document.getElementById('longitudeValue')?.textContent || '';

    // photo: choose capturedPhoto if exists, or a created #photoPreview img (we create below when needed)
    let photoImg = document.getElementById('photoPreview');
    const capturedPhoto = document.getElementById('capturedPhoto');
    if (!photoImg) {
      // create hidden img element to use consistently
      photoImg = document.createElement('img');
      photoImg.id = 'photoPreview';
      photoImg.style.display = 'none';
      document.body.appendChild(photoImg);
    }
    if (capturedPhoto && capturedPhoto.src) photoImg.src = capturedPhoto.src;

    const photoData = photoImg.src && !photoImg.src.includes('data:,') ? photoImg.src : null;

    // drawing canvas -> data URL
    const drawingCanvas = document.getElementById('drawingCanvas');
    const drawingData = drawingCanvas ? drawingCanvas.toDataURL('image/png') : null;

    // --- Build PDF content (page 1) ---
    let y = margin + 5;

    pdf.setFontSize(14);
    pdf.setFont(undefined, 'bold');
    const mainTitle = 'TASK DOCUMENT';
    pdf.text(mainTitle, (pageWidth - pdf.getTextWidth(mainTitle)) / 2, y);
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
    y = addKeyValue(pdf, 'Date:', date, margin, y);

    if (locationAddress || (latitude && longitude)) {
      y = addKeyValue(pdf, 'Location:', locationAddress || 'Provided via map', margin, y);
      if (latitude && longitude) {
        y = addKeyValue(pdf, 'Coordinates:',
          `Latitude: ${parseFloat(latitude).toFixed(6)} | Longitude: ${parseFloat(longitude).toFixed(6)}`,
          margin, y);
        // add clickable maps link
        const mapsWebLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        pdf.setTextColor(0, 0, 255);
        pdf.textWithLink('🌍 View on Google Maps', margin, y + 5, { url: mapsWebLink });
        pdf.setTextColor(0, 0, 0);
        y += 8;
      }
    } else {
      y = addKeyValue(pdf, 'Location:', 'Not Provided', margin, y);
    }

    y = addKeyValue(pdf, 'Address:', address, margin, y);
    y = addKeyValue(pdf, 'Description:', description, margin, y + 3);
    y += 8;

    y = addContent(pdf, 'ATTACHMENT SUMMARY', margin, y, { bold: true });
    y = addKeyValue(pdf, 'Photo:', photoData ? 'Attached (see next page)' : 'Not Attached', margin, y);
    y = addKeyValue(pdf, 'Drawing/Signature:', drawingData ? 'Attached (see next page)' : 'Not Attached', margin, y);

    // --- Page 2: photo ---
    if (photoData) {
      pdf.addPage();
      addFullPageImage(pdf, photoData, 'ATTACHED PHOTO', inferImageFormat(photoData));
    }

    // --- Page 3: drawing ---
    if (drawingData) {
      pdf.addPage();
      addFullPageImage(pdf, drawingData, 'DRAWING / SIGNATURE', 'PNG');
    }

    // ---- Download using Blob (alerts as requested) ----
    alert('📄 Generating your PDF, please wait...');
    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);

    // Download started alert
    alert('✅ Download started. Your PDF will appear shortly.');

    const a = document.createElement('a');
    a.href = url;
    a.download = `Task-Document-${taskNo || 'Unknown'}.pdf`;
    document.body.appendChild(a);
    a.style.display = 'none';
    a.click();
    document.body.removeChild(a);

    // cleanup and completed alert
    setTimeout(() => {
      URL.revokeObjectURL(url);
      alert('✅ Download completed successfully! Check your Downloads folder.');
    }, 1200);

    return true;
  } catch (err) {
    console.error('PDF generation error:', err);
    alert('❌ Error generating PDF. Please try again.');
    return false;
  }
}

/* ------------------------------------------------------------------------
  Camera module
  Elements used (from HTML):
   - cameraModal, cameraPreview (video), captureBtn, retakeBtn, usePhotoBtn
   - capturedPhoto (img tag to preview captured image)
   - takePhoto (trigger to open camera modal)
-------------------------------------------------------------------------*/
function initCameraModule() {
  const openCameraBtn = document.getElementById('takePhoto');
  const cameraModalEl = document.getElementById('cameraModal');
  const cameraPreview = document.getElementById('cameraPreview');
  const capturedPhoto = document.getElementById('capturedPhoto');
  const captureBtn = document.getElementById('captureBtn');
  const retakeBtn = document.getElementById('retakeBtn');
  const usePhotoBtn = document.getElementById('usePhotoBtn');

  if (!cameraModalEl || !cameraPreview) {
    console.warn('Camera elements missing — camera module not initialized');
    return;
  }

  // Bootstrap modal instance
  const cameraModal = new bootstrap.Modal(cameraModalEl, { backdrop: 'static', keyboard: false });

  let stream = null;

  async function openCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      cameraPreview.srcObject = stream;
      cameraPreview.play();
      capturedPhoto.parentElement.style.display = 'none';
      cameraPreview.style.display = 'block';
      captureBtn.style.display = '';
      retakeBtn.style.display = 'none';
      usePhotoBtn.style.display = 'none';
      cameraModal.show();
    } catch (err) {
      console.error('Camera open failed', err);
      alert('Camera not available or permission denied. Please allow camera access and try again.');
    }
  }

  function stopStream() {
    if (stream && stream.getTracks) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  openCameraBtn?.addEventListener('click', () => openCamera());

  captureBtn?.addEventListener('click', () => {
    // capture frame to hidden canvas and show preview
    const photoCanvas = document.getElementById('photoCanvas');
    const ctx = photoCanvas.getContext('2d');
    const vw = cameraPreview.videoWidth || cameraPreview.clientWidth;
    const vh = cameraPreview.videoHeight || cameraPreview.clientHeight;
    photoCanvas.width = vw;
    photoCanvas.height = vh;
    ctx.drawImage(cameraPreview, 0, 0, vw, vh);

    const dataUrl = photoCanvas.toDataURL('image/jpeg', 0.9);
    capturedPhoto.src = dataUrl;
    capturedPhoto.parentElement.style.display = 'block';
    cameraPreview.style.display = 'none';

    captureBtn.style.display = 'none';
    retakeBtn.style.display = '';
    usePhotoBtn.style.display = '';
    stopStream();
  });

  retakeBtn?.addEventListener('click', () => {
    // allow retake
    openCamera();
  });

  usePhotoBtn?.addEventListener('click', () => {
    // user accepts photo -> set as #photoPreview for PDF usage
    let photoPreview = document.getElementById('photoPreview');
    if (!photoPreview) {
      photoPreview = document.createElement('img');
      photoPreview.id = 'photoPreview';
      photoPreview.style.display = 'none';
      document.body.appendChild(photoPreview);
    }
    photoPreview.src = capturedPhoto.src;

    // show small UI confirmation
    const photoStatus = document.getElementById('photoStatus');
    if (photoStatus) {
      photoStatus.style.display = 'block';
      const photoStatusText = document.getElementById('photoStatusText');
      if (photoStatusText) photoStatusText.textContent = 'Photo ready to attach';
    }

    // close modal
    const cameraModalObj = bootstrap.Modal.getInstance(cameraModalEl);
    cameraModalObj?.hide();
    stopStream();
  });

  // cleanup when modal closed
  cameraModalEl.addEventListener('hidden.bs.modal', () => stopStream());
}

/* ------------------------------------------------------------------------
  Drawing module
  Basic pen, brush size, color palette, save to localStorage, delete
  Elements: drawingCanvas, startDrawing, clearDrawing, saveDrawing, deleteSavedDrawing,
            brushSize, brushSizeValue, color-option, customColor, savedDrawingImg, savedDrawingsList, toggleSavedDrawings
-------------------------------------------------------------------------*/
function initDrawingModule() {
  const canvas = document.getElementById('drawingCanvas');
  if (!canvas) {
    console.warn('Drawing canvas not found');
    return;
  }
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let currentColor = '#000000';
  let brushSize = parseInt(document.getElementById('brushSize')?.value || '5', 10);

  // default canvas clear
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // UI elements
  const startBtn = document.getElementById('startDrawing');
  const clearBtn = document.getElementById('clearDrawing');
  const saveBtn = document.getElementById('saveDrawing');
  const deleteSavedBtn = document.getElementById('deleteSavedDrawing');
  const brushRange = document.getElementById('brushSize');
  const brushValue = document.getElementById('brushSizeValue');
  const colorOptions = document.querySelectorAll('.color-option');
  const customColorInput = document.getElementById('customColor');
  const savedDrawingImg = document.getElementById('savedDrawingImg');
  const savedList = document.getElementById('savedDrawingsList');
  const noSaved = document.getElementById('noSavedDrawings');
  const toggleSavedBtn = document.getElementById('toggleSavedDrawings');

  // set initial UI
  brushValue && (brushValue.textContent = `${brushSize}px`);

  // Input handlers
  brushRange?.addEventListener('input', (e) => {
    brushSize = parseInt(e.target.value, 10);
    brushValue && (brushValue.textContent = `${brushSize}px`);
  });

  colorOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      colorOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      currentColor = opt.dataset.color || '#000000';
      if (currentColor === '#ffffff') {
        // white as eraser color draws white
      }
    });
  });

  customColorInput?.addEventListener('change', (e) => {
    currentColor = e.target.value;
    colorOptions.forEach(o => o.classList.remove('active'));
  });

  // Drawing handlers
  function startDraw(e) {
    drawing = true;
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    ctx.moveTo((e.clientX || e.touches[0].clientX) - rect.left, (e.clientY || e.touches[0].clientY) - rect.top);
  }
  function drawMove(e) {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  function endDraw() {
    drawing = false;
    ctx.closePath();
  }

  // Mouse events
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', drawMove);
  window.addEventListener('mouseup', endDraw);

  // Touch events
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDraw(e); });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); drawMove(e); });
  canvas.addEventListener('touchend', (e) => { e.preventDefault(); endDraw(e); });

  // Buttons
  startBtn?.addEventListener('click', () => {
    // no-op: canvas is interactive already; provide feedback
    const statusText = document.getElementById('statusText');
    if (statusText) statusText.textContent = 'Ready to draw';
  });

  clearBtn?.addEventListener('click', () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  saveBtn?.addEventListener('click', () => {
    const data = canvas.toDataURL('image/png');
    const drawings = JSON.parse(localStorage.getItem('saved_drawings') || '[]');
    drawings.push({ id: Date.now(), data });
    localStorage.setItem('saved_drawings', JSON.stringify(drawings));
    showSavedPreview(data);
    showTemporaryStatus('drawingStatus', 'Drawing saved successfully!');
    renderSavedList();
  });

  deleteSavedBtn?.addEventListener('click', () => {
    localStorage.removeItem('saved_drawings');
    renderSavedList();
    showTemporaryStatus('deleteStatus', 'All saved drawings deleted!');
  });

  toggleSavedBtn?.addEventListener('click', () => {
    const list = document.getElementById('savedDrawingsList');
    if (list.style.display === 'none' || !list.style.display) list.style.display = 'block';
    else list.style.display = 'none';
  });

  // Helper: show saved preview
  function showSavedPreview(dataUrl) {
    if (!savedDrawingImg) return;
    savedDrawingImg.src = dataUrl;
    savedDrawingImg.style.display = 'block';
    const previewActions = document.getElementById('previewActions');
    if (previewActions) previewActions.style.display = 'block';
  }

  // Helper: show temporary status alerts
  function showTemporaryStatus(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = 'block';
    const span = el.querySelector('span');
    if (span) span.textContent = message;
    setTimeout(() => el.style.display = 'none', 2500);
  }

  // Render saved drawings list
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
      const card = document.createElement('div');
      card.className = 'saved-item';
      card.innerHTML = `<img src="${d.data}" style="max-width:120px; display:block; margin-bottom:6px;"><div class="d-grid gap-1"><button class="btn btn-sm btn-primary load-drawing" data-id="${d.id}">Load</button><button class="btn btn-sm btn-danger delete-drawing" data-id="${d.id}">Delete</button></div>`;
      savedList.appendChild(card);
    });

    // wire load/delete buttons
    savedList.querySelectorAll('.load-drawing').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const id = btn.dataset.id;
        const drawings = JSON.parse(localStorage.getItem('saved_drawings') || '[]');
        const found = drawings.find(x => String(x.id) === String(id));
        if (found) {
          const img = new Image();
          img.onload = function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
        showTemporaryStatus('deleteStatus', 'Drawing deleted successfully!');
      });
    });
  }

  // initial render
  renderSavedList();
}

/* ------------------------------------------------------------------------
  Location Picker module (Leaflet)
  Elements used: openLocationPicker, locationPickerModal, map, gpsBtn, confirmLocationBtn,
                 locationInput, latitudeValue, longitudeValue, addressLine1, addressLine2, loading
-------------------------------------------------------------------------*/
function initLocationPicker() {
  const openBtn = document.getElementById('openLocationPicker');
  const modalEl = document.getElementById('locationPickerModal');
  const confirmBtn = document.getElementById('confirmLocationBtn');
  const locationInput = document.getElementById('locationInput');
  const latitudeValue = document.getElementById('latitudeValue');
  const longitudeValue = document.getElementById('longitudeValue');
  const addressLine1 = document.getElementById('addressLine1');
  const addressLine2 = document.getElementById('addressLine2');
  const loadingEl = document.getElementById('loading');
  const gpsBtn = document.getElementById('gpsBtn');
  const mapContainer = document.getElementById('map');

  if (!openBtn || !modalEl || !mapContainer) {
    console.warn('Location picker elements missing');
    return;
  }

  let map, marker;
  let mapInitialized = false;

  // show modal (Bootstrap)
  const locModal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });

  openBtn.addEventListener('click', () => {
    locModal.show();
    setTimeout(() => {
      if (!mapInitialized) initMap();
      map.invalidateSize && map.invalidateSize();
    }, 300);
  });

  function initMap() {
    map = L.map('map', { zoomControl: false }).setView([6.9271, 79.8612], 13); // default to Colombo
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    marker = L.marker(map.getCenter(), { draggable: true }).addTo(map);

    // when marker dragged, update coords & reverse geocode
    marker.on('moveend', () => {
      const latlng = marker.getLatLng();
      updateLocationDisplay(latlng.lat, latlng.lng);
      reverseGeocode(latlng.lat, latlng.lng);
    });

    // when map clicked, move marker
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      updateLocationDisplay(e.latlng.lat, e.latlng.lng);
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    });

    // search button basic behavior: does a simple Nominatim lookup
    document.getElementById('searchButton')?.addEventListener('click', () => {
      const q = document.getElementById('locationInput')?.value;
      if (!q) return;
      // use nominatim
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`)
        .then(r => r.json())
        .then(results => {
          const resultsEl = document.getElementById('searchResults');
          resultsEl.innerHTML = '';
          results.forEach(r => {
            const li = document.createElement('div');
            li.className = 'search-result-item';
            li.textContent = r.display_name;
            li.addEventListener('click', () => {
              marker.setLatLng([r.lat, r.lon]);
              map.setView([r.lat, r.lon], 16);
              updateLocationDisplay(parseFloat(r.lat), parseFloat(r.lon));
              addressLine1.textContent = r.display_name;
              document.getElementById('searchResults').innerHTML = '';
            });
            resultsEl.appendChild(li);
          });
        }).catch(err => console.error('Search failed', err));
    });

    // gps button to get current position
    gpsBtn?.addEventListener('click', () => {
      if (!navigator.geolocation) {
        alert('Geolocation not supported');
        return;
      }
      loadingEl && (loadingEl.style.display = 'flex');
      navigator.geolocation.getCurrentPosition(pos => {
        loadingEl && (loadingEl.style.display = 'none');
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        marker.setLatLng([lat, lng]);
        map.setView([lat, lng], 16);
        updateLocationDisplay(lat, lng);
        reverseGeocode(lat, lng);
      }, err => {
        loadingEl && (loadingEl.style.display = 'none');
        alert('Unable to get location: ' + err.message);
      }, { enableHighAccuracy: true, timeout: 10000 });
    });

    mapInitialized = true;
  }

  function updateLocationDisplay(lat, lng) {
    if (latitudeValue) latitudeValue.textContent = lat.toFixed(6);
    if (longitudeValue) longitudeValue.textContent = lng.toFixed(6);
    if (addressLine2) addressLine2.textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
  }

  function reverseGeocode(lat, lng) {
    // Use Nominatim reverse geocode
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then(r => r.json())
      .then(res => {
        if (res?.display_name) addressLine1.textContent = res.display_name;
      })
      .catch(err => console.warn('Reverse geocode failed', err));
  }

  // Confirm location -> copy to main form and close modal
  confirmBtn.addEventListener('click', () => {
    const lat = document.getElementById('latitudeValue')?.textContent || '';
    const lng = document.getElementById('longitudeValue')?.textContent || '';
    const addr = document.getElementById('addressLine1')?.textContent || '';
    const taskLocation = document.getElementById('taskLocation');
    if (taskLocation) {
      taskLocation.value = addr || `${lat}, ${lng}` || 'Selected location';
    }
    // hide modal
    const m = bootstrap.Modal.getInstance(modalEl);
    m?.hide();
  });
}

/* ------------------------------------------------------------------------
  Small helpers used in many places
-------------------------------------------------------------------------*/
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

// try to infer image type from data URL
function inferImageFormat(dataUrl) {
  if (!dataUrl) return 'JPEG';
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/jpeg')) return 'JPEG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
}

// full page image helper
function addFullPageImage(pdf, imgData, title, format) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  const titleW = pdf.getTextWidth(title);
  pdf.text(title, (pageWidth - titleW) / 2, 18);

  // provide margin and fit
  const margin = 15;
  const maxW = pageWidth - margin * 2;
  const maxH = pageHeight - 50;
  // calculate aspect fit
  const img = new Image();
  img.onload = function () {
    let iw = img.width;
    let ih = img.height;
    let scale = Math.min(maxW / iw, maxH / ih);
    let w = iw * scale;
    let h = ih * scale;
    const x = margin + (maxW - w) / 2;
    const y = 28;
    try {
      pdf.addImage(imgData, format, x, y, w, h);
    } catch (err) {
      console.warn('addImage failed', err);
    }
  };
  img.src = imgData;
}
