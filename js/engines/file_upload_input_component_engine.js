/**
 * file_upload_input_component_engine.js
 * 
 * Engine for creating file upload components that match the DynamicSite
 * design language. Styled like buttons (single-option sliders) but with
 * drag-and-drop and file selection functionality.
 * 
 * Date: 22-May-2025
 * Deployment Timestamp: [TO BE UPDATED ON DEPLOYMENT]
 */

class file_upload_input_component_engine {
  constructor(options = {}, changeHandler = null) {
    // Default options
    this.options = {
      id: options.id || `file-upload-${Date.now()}`,
      text: options.text || 'Drag & Drop To Upload or Select to Browse',
      acceptedFiles: options.acceptedFiles || '*', // e.g., 'image/*', '.pdf', etc.
      multiple: options.multiple || false,
      maxSize: options.maxSize || 10 * 1024 * 1024, // 10MB default
      maxFiles: options.maxFiles || 10,
      showFileList: options.showFileList !== false, // Show selected files by default
      icon: options.icon || '📁',
      ...options
    };
    
    this.changeHandler = changeHandler;
    this.element = null;
    this.container = null;
    this.fileInput = null;
    this.fileListElement = null;
    this.selectedFiles = [];
    this.isDragging = false;
    
    console.log(`[file_upload_input_component_engine] Initialized with options:`, this.options);
  }
  
  /**
   * Render the file upload component into the specified container
   * @param {string|HTMLElement} container - Container ID or element
   * @returns {HTMLElement} The created file upload element
   */
  render(container) {
    // Get container element
    const containerEl = typeof container === 'string' 
      ? document.getElementById(container)
      : container;
      
    if (!containerEl) {
      console.error(`[file_upload_input_component_engine] Container not found:`, container);
      return null;
    }
    
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'file-upload-container';
    this.container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 5px 0;
      gap: 10px;
    `;
    
    // Create upload button (styled like button engine)
    this.element = document.createElement('div');
    this.element.className = 'file-upload-selector';
    this.element.id = this.options.id;
    
    // Apply button-like styles
    this.applyStyles();
    
    // Create inner structure matching button
    this.element.innerHTML = `
      <div class="border-container">
        <div class="border-segment border-top"></div>
        <div class="border-segment border-bottom"></div>
      </div>
      <div class="upload-background"></div>
      <div class="upload-content">
        <span class="upload-icon">${this.options.icon}</span>
        <h3>${this.options.text}</h3>
      </div>
    `;
    
    // Create hidden file input
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.id = `${this.options.id}-input`;
    this.fileInput.accept = this.options.acceptedFiles;
    this.fileInput.multiple = this.options.multiple;
    this.fileInput.style.display = 'none';
    
    // Create file list element if needed
    if (this.options.showFileList) {
      this.fileListElement = document.createElement('div');
      this.fileListElement.className = 'file-upload-list';
      this.fileListElement.style.cssText = `
        display: none;
        width: 100%;
        max-width: 400px;
        margin-top: 5px;
      `;
    }
    
    // Add event listeners
    this.attachEventListeners();
    
    // Add to container
    this.container.appendChild(this.fileInput);
    this.container.appendChild(this.element);
    if (this.fileListElement) {
      this.container.appendChild(this.fileListElement);
    }
    containerEl.appendChild(this.container);
    
    console.log(`[file_upload_input_component_engine] Rendered file upload:`, this.options.id);
    
    return this.element;
  }
  
  /**
   * Apply button-matching styles with upload-specific enhancements
   */
  applyStyles() {
    // Base styles matching button selector
    const baseStyles = `
      display: inline-flex;
      position: relative;
      height: auto;
      border-radius: 9999px;
      background: linear-gradient(
        -25deg,
        var(--light-slider-start) 0%,
        var(--light-slider-end) 100%
      );
      overflow: visible;
      padding: 0;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    
    this.element.style.cssText = baseStyles;
    
    // Add dynamic styles
    if (!document.getElementById('file-upload-engine-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'file-upload-engine-styles';
      styleSheet.textContent = `
        /* Dark theme support */
        body[data-theme="dark"] .file-upload-selector {
          background: linear-gradient(
            -25deg,
            var(--dark-slider-start) 0%,
            var(--dark-slider-end) 100%
          );
        }
        
        /* Border container */
        .file-upload-selector .border-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          clip-path: inset(0 0 0 0 round 9999px);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        /* Show borders on hover and drag */
        .file-upload-selector:hover .border-container,
        .file-upload-selector.dragging .border-container {
          opacity: 1;
        }
        
        /* Border segments */
        .file-upload-selector .border-segment {
          position: absolute;
          background: linear-gradient(
            to right,
            var(--active-button-start),
            var(--active-button-end)
          );
          height: 1px;
          width: 100%;
          transition: transform 0.3s ease;
        }
        
        .file-upload-selector .border-top {
          top: 0;
        }
        
        .file-upload-selector .border-bottom {
          bottom: 0;
        }
        
        /* Upload background */
        .file-upload-selector .upload-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          height: 100%;
          width: 100%;
          border-radius: 9999px;
          background: linear-gradient(
            145deg,
            var(--active-button-start),
            var(--active-button-end)
          );
          z-index: 0;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        /* Show background when dragging */
        .file-upload-selector.dragging .upload-background {
          opacity: 0.5;
        }
        
        /* Upload content */
        .file-upload-selector .upload-content {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          z-index: 2;
          padding: 4px 20px;
          gap: 8px;
        }
        
        .file-upload-selector .upload-content h3 {
          white-space: nowrap;
          overflow: visible;
          text-overflow: clip;
          max-width: none;
          font-size: clamp(0.5rem, 1.2vw, 2.3rem);
          margin: 0;
          font-weight: bold;
          color: #ffffff;
          transition: color 0.3s ease;
        }
        
        /* Icon styling */
        .file-upload-selector .upload-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: inherit;
          color: inherit;
        }
        
        /* File list styling */
        .file-upload-list {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
          padding: 10px;
        }
        
        body[data-theme="dark"] .file-upload-list {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .file-upload-list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 10px;
          margin: 5px 0;
          background: linear-gradient(
            -25deg,
            var(--light-slider-start) 0%,
            var(--light-slider-end) 100%
          );
          border-radius: 9999px;
          color: #ffffff;
          font-size: clamp(0.4rem, 1vw, 2rem);
        }
        
        body[data-theme="dark"] .file-upload-list-item {
          background: linear-gradient(
            -25deg,
            var(--dark-slider-start) 0%,
            var(--dark-slider-end) 100%
          );
        }
        
        .file-upload-list-item button {
          background: none;
          border: none;
          color: #ffffff;
          cursor: pointer;
          padding: 0 5px;
          font-size: inherit;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        
        .file-upload-list-item button:hover {
          opacity: 1;
        }
        
        /* Drag state visual feedback */
        .file-upload-selector.dragging {
          transform: scale(1.05);
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }
  
  /**
   * Attach event listeners for file upload, drag and drop
   */
  attachEventListeners() {
    // Click to open file dialog
    this.element.addEventListener('click', (e) => {
      e.preventDefault();
      this.fileInput.click();
    });
    
    // File input change
    this.fileInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });
    
    // Drag and drop events
    this.element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.isDragging) {
        this.isDragging = true;
        this.element.classList.add('dragging');
      }
    });
    
    this.element.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Check if we're actually leaving the element
      if (!this.element.contains(e.relatedTarget)) {
        this.isDragging = false;
        this.element.classList.remove('dragging');
      }
    });
    
    this.element.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.isDragging = false;
      this.element.classList.remove('dragging');
      
      const files = e.dataTransfer.files;
      this.handleFiles(files);
    });
    
    // Prevent text selection on double click
    this.element.addEventListener('selectstart', (e) => {
      e.preventDefault();
    });
  }
  
  /**
   * Handle file selection
   * @param {FileList} files - Selected files
   */
  handleFiles(files) {
    const validFiles = [];
    const errors = [];
    
    // Convert FileList to Array
    const fileArray = Array.from(files);
    
    // Check file count limit
    if (!this.options.multiple && fileArray.length > 1) {
      errors.push('Only one file allowed');
      fileArray.splice(1);
    }
    
    if (this.options.multiple && fileArray.length > this.options.maxFiles) {
      errors.push(`Maximum ${this.options.maxFiles} files allowed`);
      fileArray.splice(this.options.maxFiles);
    }
    
    // Validate each file
    fileArray.forEach(file => {
      // Check file size
      if (file.size > this.options.maxSize) {
        errors.push(`${file.name} exceeds maximum size of ${this.formatFileSize(this.options.maxSize)}`);
        return;
      }
      
      // Check file type if specified
      if (this.options.acceptedFiles !== '*') {
        const accepted = this.options.acceptedFiles.split(',').map(s => s.trim());
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        const mimeType = file.type;
        
        let isAccepted = false;
        for (const accept of accepted) {
          if (accept.startsWith('.') && fileExt === accept.toLowerCase()) {
            isAccepted = true;
            break;
          }
          if (accept.endsWith('/*') && mimeType.startsWith(accept.slice(0, -2))) {
            isAccepted = true;
            break;
          }
          if (mimeType === accept) {
            isAccepted = true;
            break;
          }
        }
        
        if (!isAccepted) {
          errors.push(`${file.name} is not an accepted file type`);
          return;
        }
      }
      
      validFiles.push(file);
    });
    
    // Update selected files
    if (this.options.multiple) {
      this.selectedFiles = [...this.selectedFiles, ...validFiles];
    } else {
      this.selectedFiles = validFiles;
    }
    
    // Update file list display
    this.updateFileList();
    
    // Call change handler
    if (this.changeHandler) {
      this.changeHandler(this.selectedFiles, errors);
    }
    
    // Log results
    console.log(`[file_upload_input_component_engine] Files selected:`, this.selectedFiles);
    if (errors.length > 0) {
      console.warn(`[file_upload_input_component_engine] File errors:`, errors);
    }
  }
  
  /**
   * Update the file list display
   */
  updateFileList() {
    if (!this.fileListElement) return;
    
    if (this.selectedFiles.length === 0) {
      this.fileListElement.style.display = 'none';
      return;
    }
    
    this.fileListElement.style.display = 'block';
    this.fileListElement.innerHTML = '';
    
    this.selectedFiles.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'file-upload-list-item';
      item.innerHTML = `
        <span>${file.name} (${this.formatFileSize(file.size)})</span>
        <button data-index="${index}">✕</button>
      `;
      
      // Add remove handler
      const removeBtn = item.querySelector('button');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeFile(index);
      });
      
      this.fileListElement.appendChild(item);
    });
  }
  
  /**
   * Remove a file from the selection
   * @param {number} index - File index to remove
   */
  removeFile(index) {
    this.selectedFiles.splice(index, 1);
    this.updateFileList();
    
    // Clear input value to allow re-selecting same file
    this.fileInput.value = '';
    
    // Call change handler
    if (this.changeHandler) {
      this.changeHandler(this.selectedFiles, []);
    }
  }
  
  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Clear all selected files
   */
  clearFiles() {
    this.selectedFiles = [];
    this.fileInput.value = '';
    this.updateFileList();
  }
  
  /**
   * Get selected files
   * @returns {Array} Selected files
   */
  getFiles() {
    return this.selectedFiles;
  }
  
  /**
   * Update upload text
   * @param {string} text - New text
   */
  setText(text) {
    this.options.text = text;
    const h3 = this.element.querySelector('.upload-content h3');
    if (h3) {
      h3.textContent = text;
    }
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.element = null;
    this.container = null;
    this.fileInput = null;
    this.fileListElement = null;
    this.selectedFiles = [];
    console.log(`[file_upload_input_component_engine] Destroyed:`, this.options.id);
  }
}

// Export for ES6 modules
export { file_upload_input_component_engine };
