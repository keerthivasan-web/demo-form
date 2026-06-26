/**
 * html2pdf.js - Custom PDF Generation Helper for CVE&WD Forms
 * Optimizes the HTML form layout and elements specifically for high-quality PDF generation.
 */

window.generateFormPDF = function (element, filename, callback) {
  // 1. Clone the target element
  const clone = element.cloneNode(true);

  // Copy the in-memory values and checked/selected states from original tree to clone tree
  const originalInputs = element.querySelectorAll('input, select, textarea');
  const clonedInputs = clone.querySelectorAll('input, select, textarea');
  for (let i = 0; i < originalInputs.length; i++) {
    const orig = originalInputs[i];
    const cln = clonedInputs[i];
    if (orig.type === 'radio' || orig.type === 'checkbox') {
      cln.checked = orig.checked;
    } else if (orig.tagName === 'SELECT') {
      cln.selectedIndex = orig.selectedIndex;
    } else {
      cln.value = orig.value;
    }
  }

  // Remove the ID to avoid duplicates in the DOM during rendering
  clone.removeAttribute('id');
  clone.classList.add('pdf-render-mode');

  // Remove elements of the inactive template mode completely from the clone to fit on a single A4 sheet
  const isDriverMode = document.body.classList.contains('form-mode-driver');
  if (isDriverMode) {
    clone.querySelectorAll('.trainee-only-row').forEach(el => el.remove());
  } else {
    clone.querySelectorAll('.driver-only-row').forEach(el => el.remove());
  }

  // Create a container off-screen to append the clone to (to ensure styles apply correctly)
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // Standard A4 width at 96 DPI (approx 8.27in)
  container.style.background = '#ffffff';

  // Sync the form template mode class from the document body to apply mode-specific rules
  container.className = document.body.className;
  container.appendChild(clone);
  document.body.appendChild(container);

  // 2. Perform element replacements in the clone

  // A. Process text, date, telephone, and number inputs
  const inputs = clone.querySelectorAll('input[type="text"], input[type="tel"], input[type="date"], input[type="number"]');
  inputs.forEach(input => {
    const val = input.value.trim();

    const span = document.createElement('span');
    span.className = 'pdf-static-value';

    // Format date values nicely if possible (timezone-safe)
    if (input.type === 'date' && val) {
      const parts = val.split('-');
      if (parts.length === 3) {
        const yyyy = parts[0];
        const mm = parts[1];
        const dd = parts[2];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = parseInt(mm, 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          span.textContent = `${dd}-${months[monthIndex]}-${yyyy}`;
        } else {
          span.textContent = val;
        }
      } else {
        span.textContent = val;
      }
    } else {
      span.textContent = val || '';
    }

    // Replace input field with static text span
    input.parentNode.replaceChild(span, input);
  });

  // B. Process select dropdowns
  const selects = clone.querySelectorAll('select');
  selects.forEach(select => {
    const selectedOption = select.options[select.selectedIndex];
    const val = selectedOption ? selectedOption.text : '';

    const span = document.createElement('span');
    span.className = 'pdf-static-value';
    span.textContent = val === 'Select Blood Group' ? '' : val;

    select.parentNode.replaceChild(span, select);
  });

  // C. Process textareas
  const textareas = clone.querySelectorAll('textarea');
  textareas.forEach(textarea => {
    const val = textarea.value.trim();

    const span = document.createElement('span');
    span.className = 'pdf-static-value pdf-textarea-value';
    span.innerHTML = val.replace(/\n/g, '<br>');

    textarea.parentNode.replaceChild(span, textarea);
  });

  // D. Process radio buttons and checkboxes
  // Convert standard HTML radio buttons and checkboxes to styled print boxes to avoid layout distortion by html2canvas
  const optionContainers = clone.querySelectorAll('.option-container');
  optionContainers.forEach((container, idx) => {
    const radio = container.querySelector('input[type="radio"], input[type="checkbox"]');
    if (radio) {
      const isChecked = radio.checked;

      // Create a neat checkbox square representation
      const box = document.createElement('span');
      box.className = isChecked ? 'pdf-radio-box pdf-radio-checked' : 'pdf-radio-box';
      box.innerHTML = isChecked ? '&#10004;' : '&nbsp;'; // Unicode tick marks

      radio.parentNode.replaceChild(box, radio);
    }
  });

  // E. Remove interactive button controls inside the clone
  clone.querySelectorAll('.no-print').forEach(el => el.remove());

  // Inject clean print-optimizing CSS overrides inside the clone
  const style = document.createElement('style');
  style.textContent = `
    .pdf-render-mode {
      padding: 12px 15px !important;
      margin: 0 !important;
      background: #ffffff !important;
      border: none !important;
      box-shadow: none !important;
      font-family: 'Inter', system-ui, sans-serif !important;
      color: #000000 !important;
      width: 764px !important; /* matches standard A4 width printable area */
      height: 1070px !important; /* matches standard A4 height printable area ratio */
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
    }
    
    .pdf-render-mode .form-grid {
      border: 1.5px solid #000000 !important;
      width: 100% !important;
      flex-grow: 1 !important;
      display: flex !important;
      flex-direction: column !important;
    }
    
    .pdf-render-mode .field-row {
      border-bottom: 1.5px solid #000000 !important;
      min-height: 20px !important;
      flex: 1 !important;
      display: grid !important;
      grid-template-columns: 200px 1fr !important;
      align-items: stretch !important;
    }
    
    .pdf-render-mode .field-row.tall {
      min-height: 40px !important;
      flex: 2 !important;
      display: grid !important;
      grid-template-columns: 200px 1fr !important;
      align-items: stretch !important;
    }
    
    .pdf-render-mode .field-row.tall[style*="min-height: 100px"],
    .pdf-render-mode .field-row.tall[style*="min-height:100px"] {
      min-height: 60px !important;
      flex: 3 !important;
      display: grid !important;
      grid-template-columns: 200px 1fr !important;
      align-items: stretch !important;
    }
    
    .pdf-render-mode .split-row {
      border-bottom: 1.5px solid #000000 !important;
      min-height: 20px !important;
      flex: 1 !important;
      display: grid !important;
      grid-template-columns: 200px 1fr 120px 1fr !important;
      align-items: stretch !important;
    }
    
    .pdf-render-mode .field-label,
    .pdf-render-mode .split-label,
    .pdf-render-mode .exp-label,
    .pdf-render-mode .exp-sub-inner-label {
      background: #f8fafc !important;
      color: #000000 !important;
      border-right: 1.5px solid #000000 !important;
      font-size: 8.5px !important;
      font-weight: 700 !important;
      padding: 2px 5px !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      display: flex;
      align-items: center;
    }
    
    .pdf-render-mode .split-input {
      border-right: 1.5px solid #000000 !important;
    }
    .pdf-render-mode .split-input:last-child {
      border-right: none !important;
    }
    
    .pdf-render-mode .logo-org-box {
      border: 1.5px solid #000000 !important;
      margin-bottom: 6px !important;
      width: 100% !important; /* Full width for PDF */
    }
    
    .pdf-render-mode .logo-box {
      border-right: 1.5px solid #000000 !important;
      background: #e85d97 !important;
      color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      padding: 5px 10px !important;
      font-size: 15px !important;
    }
    
    .pdf-render-mode .org-name {
      font-size: 8px !important;
      padding: 3px 6px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      text-align: center !important;
      flex: 1 !important;
    }
    
    .pdf-render-mode .doc-number-box {
      border-left: 1.5px solid #000000 !important;
      background: #f8fafc !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      padding: 3px 6px !important;
      min-width: 150px !important;
    }
    
    .pdf-render-mode .sheet-title {
      border-top: 1.5px solid #000000 !important;
      border-bottom: 1.5px solid #000000 !important;
      padding: 3px 0 !important;
      margin-bottom: 6px !important;
      font-size: 10px !important;
    }
    
    .pdf-static-value {
      font-size: 9px !important;
      font-weight: 500 !important;
      color: #000000 !important;
      padding: 2px 5px !important;
      display: flex;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
    }
    
    .pdf-textarea-value {
      display: block !important;
      white-space: pre-wrap !important;
      line-height: 1.2 !important;
    }
    
    .pdf-radio-box {
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      width: 11px !important;
      height: 11px !important;
      border: 1px solid #000000 !important;
      margin-right: 5px !important;
      font-size: 8px !important;
      line-height: 1 !important;
      background: #ffffff !important;
      color: #000000 !important;
      flex-shrink: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .pdf-radio-checked {
      background: #000000 !important;
      color: #ffffff !important;
    }
    
    .pdf-render-mode .photo-box {
      border: 1.5px solid #000000 !important;
      width: 65px !important;
      height: 75px !important;
      font-size: 8px !important;
    }
    
    .pdf-render-mode .meta-photo-layout {
      margin-bottom: 4px !important;
      gap: 10px !important;
    }
    
    .pdf-render-mode .signature-section {
      margin-top: auto !important; /* Pushes the signature block to the bottom of the page */
      padding-top: 10px !important;
    }
    
    .pdf-render-mode .sig-line {
      border-bottom: 1.5px solid #000000 !important;
    }
    
    .pdf-render-mode .sig-label {
      color: #000000 !important;
      font-size: 7.5px !important;
    }
    
    .pdf-render-mode .edu-layout {
      gap: 3px !important;
      padding: 3px 6px !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-around !important;
      flex-grow: 1 !important;
    }
    
    .pdf-render-mode .edu-options-row {
      gap: 8px !important;
    }
    
    .pdf-render-mode .idmarks-layout {
      display: flex !important;
      flex-direction: column !important;
      flex-grow: 1 !important;
      justify-content: stretch !important;
    }
    
    .pdf-render-mode .idmark-item {
      border-bottom: 1.5px solid #000000 !important;
      min-height: 20px !important;
      width: 100% !important;
      box-sizing: border-box !important;
      flex: 1 !important;
      display: flex !important;
      align-items: center !important;
    }
    .pdf-render-mode .idmark-item:last-child {
      border-bottom: none !important;
    }
    
    .pdf-render-mode .idmark-num {
      font-size: 9px !important;
      font-weight: 700 !important;
      padding: 2px 6px !important;
      border-right: 1.5px solid #000000 !important;
      min-width: 25px !important;
      text-align: center !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      height: 100% !important;
    }
    
    .pdf-render-mode .exp-section {
      border-bottom: 1.5px solid #000000 !important;
      flex: 4 !important;
      display: grid !important;
      grid-template-columns: 200px 1fr !important;
      align-items: stretch !important;
    }
    
    .pdf-render-mode .exp-sub-layout {
      display: flex !important;
      flex-direction: column !important;
      flex-grow: 1 !important;
      height: 100% !important;
    }
    
    .pdf-render-mode .exp-sub-row {
      border-bottom: 1.5px solid #000000 !important;
      min-height: 20px !important;
      flex: 1 !important;
      display: grid !important;
      grid-template-columns: 140px 1fr !important;
      align-items: stretch !important;
    }
    .pdf-render-mode .exp-sub-row:last-child {
      border-bottom: none !important;
    }
    
    .pdf-render-mode .exp-sub-row.split {
      display: grid !important;
      grid-template-columns: 110px 1fr 110px 1fr !important;
      align-items: stretch !important;
    }
    
    .pdf-render-mode .exp-sub-inner-input {
      border-right: 1.5px solid #000000 !important;
    }
    .pdf-render-mode .exp-sub-inner-input:last-child {
      border-right: none !important;
    }
  `;
  container.appendChild(style);

  // 3. Configure html2pdf settings
  const opt = {
    margin: [0.15, 0.15, 0.15, 0.15], // Top, left, bottom, right margins in inches
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollY: 0,
      scrollX: 0
    },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  // 4. Generate the PDF
  html2pdf().set(opt).from(clone).outputPdf('blob').then(blob => {
    // Clean up the off-screen clone container
    document.body.removeChild(container);

    // Execute callback with the resulting blob
    if (callback) {
      callback(null, blob);
    }
  }).catch(err => {
    // Clean up in case of failure
    if (container.parentNode) {
      document.body.removeChild(container);
    }
    console.error('Custom HTML to PDF conversion failed:', err);
    if (callback) {
      callback(err);
    }
  });
};
