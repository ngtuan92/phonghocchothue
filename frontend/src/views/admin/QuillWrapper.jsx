import React, { forwardRef, useEffect, useRef, useState, useCallback } from "react";
import ReactQuill, { Quill } from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import Modal from "@/components/admin/Modal";
import { Input, Button } from "@material-tailwind/react";

const URL_API = (process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/");

const SIZE_MAP = {
  "Small": "0.85rem",
  "Normal": "1.05rem",
  "Large": "2rem",
  "Huge": "5rem",
  "Super Huge": "19vw"
};

let cachedFonts = null;
let fetchPromise = null;
const COLORS = [
  "#000000", "#e60000", "#ff9900", "#ffff00", "#008a00", "#0066cc", "#9933ff",
  "#ffffff", "#facccc", "#ffebcc", "#ffffcc", "#cce8cc", "#cce0f5", "#ebd6ff",
  "#bbbbbb", "#f06666", "#ffc266", "#ffff66", "#66b966", "#66a3e0", "#c285ff",
  "#888888", "#a10000", "#b26b00", "#b2b200", "#006100", "#0047b2", "#6b24b2",
  "#444444", "#5c0000", "#663d00", "#666600", "#003700", "#002966", "#3d1466",
  "#f1c40f", "#f39c12", "#e67e22", "#d35400", "#7f8c8d", "#34495e", "#2c3e50",
  "#ffeacb", "#ffd19a", "#ffb347", "#799f85", "#e57f7f", "#563c39", "#323232",
  "custom-color"
];

const createModules = (fontList) => ({
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ font: fontList }],
    [{ size: Object.values(SIZE_MAP) }],
    ["bold", "italic", "underline", "strike"],
    [{ color: COLORS }, { background: COLORS }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ align: [] }],
    ["link", "image"],
    ["clean"],
    ["more"],
  ],
  clipboard: {
    matchers: [
      [Node.ELEMENT_NODE, (node, delta) => {
        const style = node.getAttribute('style');
        if (style && style.includes('font-family')) {
          const cleanStyle = style.replace(/font-family:\s*(&quot;|['"])?([^;'"&]+)(&quot;|['"])?/i, 'font-family: $2');
          if (cleanStyle !== style) {
            node.setAttribute('style', cleanStyle);
          }
        }
        return delta;
      }]
    ]
  }
});

if (typeof window !== "undefined" && Quill) {
  const ImageBlot = Quill.import("formats/image");
  class CustomImageBlot extends ImageBlot {
    static create(value) {
      const node = super.create(value);
      if (typeof value === "string") {
        node.setAttribute("src", value);
        node.setAttribute("data-wrap", "none");
      } else if (value && typeof value === "object") {
        node.setAttribute("src", value.src);
        if (value.alt) node.setAttribute("alt", value.alt);
        if (value.title) node.setAttribute("title", value.title);
        if (value.caption) node.setAttribute("data-caption", value.caption);
        if (value.width) {
          node.setAttribute("width", value.width);
          node.style.width = value.width.includes('%') || value.width.includes('px') ? value.width : `${value.width}px`;
        }
        if (value.borderRadius) {
          node.style.borderRadius = value.borderRadius;
          node.setAttribute("data-border-radius", value.borderRadius);
        }
        node.setAttribute("data-wrap", value.wrap || "none");
      }
      return node;
    }
    static formats(node) {
      let width = node.getAttribute("width");
      if (!width && node.style.width) {
        width = node.style.width;
      }
      let wrap = node.getAttribute("data-wrap");
      if (!wrap) {
        if (node.style.float === 'left') wrap = 'left';
        else if (node.style.float === 'right') wrap = 'right';
      }
      return {
        width: width,
        alt: node.getAttribute("alt"),
        title: node.getAttribute("title"),
        caption: node.getAttribute("data-caption"),
        borderRadius: node.style.borderRadius || node.getAttribute("data-border-radius"),
        wrap: wrap || 'none'
      };
    }
    format(name, value) {
      if (name === "width") {
        this.domNode.setAttribute("width", value);
        this.domNode.style.width = value;
      } else if (name === "alt") {
        if (value) {
          this.domNode.setAttribute("alt", value);
        } else {
          this.domNode.removeAttribute("alt");
        }
      } else if (name === "title") {
        if (value) {
          this.domNode.setAttribute("title", value);
        } else {
          this.domNode.removeAttribute("title");
        }
      } else if (name === "caption") {
        if (value) {
          this.domNode.setAttribute("data-caption", value);
        } else {
          this.domNode.removeAttribute("data-caption");
        }
      } else if (name === "borderRadius") {
        this.domNode.style.borderRadius = value || "";
        if (value) {
          this.domNode.setAttribute("data-border-radius", value);
        } else {
          this.domNode.removeAttribute("data-border-radius");
        }
      } else if (name === "wrap") {
        this.domNode.setAttribute("data-wrap", value || "none");
      } else {
        super.format(name, value);
      }
    }
  }
  CustomImageBlot.blotName = "image";
  CustomImageBlot.tagName = "img";
  Quill.register(CustomImageBlot, true);
  
  const SizeStyle = Quill.import("attributors/style/size");
  if (SizeStyle) {
    SizeStyle.whitelist = undefined;
    Quill.register(SizeStyle, true);
  }
  const AlignStyle = Quill.import("attributors/style/align");
  if (AlignStyle) {
    Quill.register(AlignStyle, true);
  }

  const ColorStyle = Quill.import("attributors/style/color");
  if (ColorStyle) {
    Quill.register(ColorStyle, true);
  }

  const BackgroundStyle = Quill.import("attributors/style/background");
  if (BackgroundStyle) {
    Quill.register(BackgroundStyle, true);
  }

  const icons = Quill.import('ui/icons');
  if (icons) {
    icons['image-settings'] = `
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="currentColor" d="M22.7,19L24,20.3L14.6,29.7L13.3,28.4L22.7,19M7,2V4H8V2H7M11,2V4H12V2H11M15,2V4H16V2H15M19,2V4H20V2H19M5,4V28H19V18.1L21,16.1V28A2,2 0 0,1 19,30H5A2,2 0 0,1 3,28V4A2,2 0 0,1 5,2H19A2,2 0 0,1 21,4V10.1L19,12.1V4H5M20.2,13C20.3,13 20.5,13.1 20.6,13.2L21.8,14.4C22,14.6 22,15 21.8,15.2L20.8,16.2L18.8,14.2L19.8,13.2C19.9,13.1 20,13 20.2,13M18.1,14.9L20.1,16.9L14,23L12,21L18.1,14.9Z" />
      </svg>
    `;
    icons['more'] = `
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="currentColor" d="M6 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
      </svg>
    `;
  }
}

const FORMATS = [
  "header", "font", "size", "bold", "italic", "underline", "strike",
  "color", "background", "list", "align", "link", "image", "wrap",
  "alt", "title", "caption", "borderRadius"
];

const slugify = (name) => name.trim().toLowerCase().replace(/\s+/g, '-');

const QuillWrapper = forwardRef((props, ref) => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [modules, setModules] = useState(null);
  const [dynamicFonts, setDynamicFonts] = useState([]);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const selectedImageRef = useRef(null);
  const [imageWrapMode, setImageWrapMode] = useState('none');
  const [resizerRect, setResizerRect] = useState(null);
  const resizerOverlayRef = useRef(null);
  const containerClickRef = useRef(null);
  const [captions, setCaptions] = useState([]);

  const updateCaptions = useCallback(() => {
    const imgContainer = containerRef.current;
    if (!imgContainer) return;
    const imgs = imgContainer.querySelectorAll('.ql-editor img');
    const wrapperRect = imgContainer.getBoundingClientRect();
    const list = [];
    imgs.forEach((img, idx) => {
      const hasDataCaption = img.hasAttribute('data-caption');
      const captionText = hasDataCaption 
        ? (img.getAttribute('data-caption') || '').trim()
        : (img.getAttribute('title') || '').trim();
      if (captionText && captionText !== '') {
        const imgRect = img.getBoundingClientRect();
        list.push({
          id: idx,
          text: captionText,
          top: imgRect.bottom - wrapperRect.top,
          left: imgRect.left - wrapperRect.left,
          width: imgRect.width
        });
      }
    });
    setCaptions(list);
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;
    const quill = editorRef.current?.getEditor();
    if (!quill) return;

    const handleUpdate = () => {
      updateCaptions();
    };

    quill.root.addEventListener('scroll', handleUpdate);
    window.addEventListener('resize', handleUpdate);
    
    const resizeObserver = new ResizeObserver(handleUpdate);
    resizeObserver.observe(quill.root);

    // Initial trigger
    setTimeout(handleUpdate, 100);

    return () => {
      if (quill?.root) {
        quill.root.removeEventListener('scroll', handleUpdate);
      }
      window.removeEventListener('resize', handleUpdate);
      resizeObserver.disconnect();
    };
  }, [isReady, updateCaptions]);

  useEffect(() => {
    if (!isReady) return;

    const initSearch = () => {
      const pickers = containerRef.current?.querySelectorAll('.ql-font .ql-picker-options');
      if (!pickers) return;

      pickers.forEach(picker => {
        if (!picker.querySelector('.font-search-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'font-search-wrapper';
          wrapper.innerHTML = '<input type="text" placeholder="Tìm kiếm font..." class="font-search-input" style="width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif;" />';
          wrapper.style.padding = '8px';
          wrapper.style.position = 'sticky';
          wrapper.style.top = '0';
          wrapper.style.backgroundColor = '#fff';
          wrapper.style.zIndex = '10';
          wrapper.style.borderBottom = '1px solid #f1f1f1';
          wrapper.style.marginBottom = '4px';

          const input = wrapper.querySelector('input');
          input.onclick = (e) => e.stopPropagation();
          input.onmousedown = (e) => e.stopPropagation();
          input.onkeydown = (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') e.preventDefault();
          };
          input.onkeyup = (e) => {
            e.stopPropagation();
            const search = e.target.value.toLowerCase().replace(/[-_ ]/g, '');
            const items = picker.querySelectorAll('.ql-picker-item');
            items.forEach(item => {
              const rawVal = item.getAttribute('data-value') || 'macdinh';
              const val = rawVal.toLowerCase().replace(/[-_ ]/g, '');
              const label = item.textContent ? item.textContent.toLowerCase().replace(/[-_ ]/g, '') : '';
              if (val.includes(search) || label.includes(search) || rawVal === 'macdinh') {
                item.style.display = 'block';
              } else {
                item.style.display = 'none';
              }
            });
          };
          
          picker.insertBefore(wrapper, picker.firstChild);
        }
      });
    };

    const interval = setInterval(initSearch, 1000);
    return () => clearInterval(interval);
  }, [isReady]);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    const initDropdown = () => {
      const toolbar = containerRef.current.querySelector('.ql-toolbar');
      if (!toolbar) return;

      const formats = Array.from(toolbar.children).filter(el => el.classList.contains('ql-formats'));
      const moreGroup = formats.find(f => f.querySelector('.ql-more'));
      if (!moreGroup) return;

      moreGroup.classList.add('ql-more-formats-group');

      let dropdown = moreGroup.querySelector('.ql-more-dropdown');
      if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'ql-more-dropdown';
        moreGroup.appendChild(dropdown);

        // Move target formatting groups (Color, List, Align, Link/Image, Clean) into dropdown
        formats.forEach((f) => {
          if (f === moreGroup) return; // Skip the moreGroup itself

          const hasColor = f.querySelector('.ql-color') || f.querySelector('.ql-background');
          const hasList = f.querySelector('.ql-list');
          const hasAlign = f.querySelector('.ql-align');
          const hasLinkImage = f.querySelector('.ql-link') || f.querySelector('.ql-image');
          const hasClean = f.querySelector('.ql-clean');

          if (hasColor || hasList || hasAlign || hasLinkImage || hasClean) {
            dropdown.appendChild(f);
          }
        });
      }
    };

    initDropdown();
    const interval = setInterval(initDropdown, 1000);

    const handleClickOutside = (event) => {
      const toolbar = containerRef.current?.querySelector('.ql-toolbar');
      if (toolbar && toolbar.classList.contains('ql-toolbar-expanded')) {
        if (!toolbar.contains(event.target)) {
          toolbar.classList.remove('ql-toolbar-expanded');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isReady]);

  React.useImperativeHandle(ref, () => ({
    getEditor: () => {
      try {
        return editorRef.current?.getEditor();
      } catch (e) {
        return null;
      }
    },
    focus: () => {
      try {
        editorRef.current?.focus();
      } catch (e) { }
    },
    blur: () => {
      try {
        editorRef.current?.blur();
      } catch (e) { }
    },
  }));

  useEffect(() => {
    const initFonts = async () => {
      if (!cachedFonts) {
        if (!fetchPromise) {
          fetchPromise = (async () => {
            try {
              const googleRes = await fetch(`${URL_API}api/fonts`);
              let googleFonts = [];
              if (googleRes.ok) {
                const data = await googleRes.json();
                googleFonts = data
                  .filter(f => f.name.trim().toLowerCase() !== 'inter')
                  .map(f => ({ 
                    name: f.name.trim(),
                    slug: slugify(f.name),
                    family: f.name.trim() 
                  }));
              }

              const localRes = await fetch(`${URL_API}api/fonts/local`);
              let localFonts = [];
              if (localRes.ok) {
                const result = await localRes.json();
                if (result.success && Array.isArray(result.data)) {
                  localFonts = result.data
                    .filter(f => f.status === 'active')
                    .map(f => ({
                      name: f.display_name,
                      slug: f.font_family,
                      family: f.font_family
                    }));
                }
              }
              const combined = [...googleFonts, ...localFonts];
              const sorted = combined.sort((a, b) => a.name.localeCompare(b.name));
              const finalWhitelist = ['macdinh', ...sorted.map(f => f.slug)];
              if (typeof window !== "undefined" && Quill) {
                const FontStyle = Quill.import("attributors/style/font");
                if (FontStyle) {
                  FontStyle.whitelist = finalWhitelist;
                  
                  // Wrap value function to normalize browser font-family name to our slug representation
                  const originalValue = FontStyle.value;
                  FontStyle.value = function (domNode) {
                    const rawVal = originalValue.call(this, domNode);
                    if (!rawVal) return rawVal;
                    
                    const cleanVal = rawVal.replace(/['"]/g, '').split(',')[0].trim().toLowerCase();
                    const cleanSlug = cleanVal.replace(/\s+/g, '-');
                    
                    if (cleanVal === 'inter' || cleanVal === 'macdinh') {
                      return 'macdinh';
                    }
                    
                    const listToSearch = sorted || cachedFonts || [];
                    const matched = listToSearch.find(f => 
                      f.slug.toLowerCase() === cleanVal ||
                      f.slug.toLowerCase() === cleanSlug ||
                      slugify(f.name) === cleanVal ||
                      slugify(f.name) === cleanSlug ||
                      slugify(f.family) === cleanVal ||
                      slugify(f.family) === cleanSlug
                    );
                    
                    if (matched) {
                      return matched.slug;
                    }
                    
                    if (finalWhitelist.includes(cleanSlug)) {
                      return cleanSlug;
                    }
                    if (finalWhitelist.includes(cleanVal)) {
                      return cleanVal;
                    }
                    
                    return rawVal;
                  };

                  Quill.register(FontStyle, true);
                }
              }
              cachedFonts = sorted;
              return sorted;
            } catch (e) {
              console.error(e);
            }
            return [];
          })();
        }
        const result = await fetchPromise;
        setDynamicFonts(result);
      } else {
        setDynamicFonts(cachedFonts);
      }
    };
    initFonts();
  }, []);

  useEffect(() => {
    if (dynamicFonts.length > 0 || (cachedFonts && cachedFonts.length >= 0)) {
      const currentFonts = dynamicFonts.length > 0 ? dynamicFonts : (cachedFonts || []);
      const toolbarFontValues = ['macdinh', ...currentFonts.map(f => f.slug)];
      setModules(createModules(toolbarFontValues));
      setIsReady(true);
    }
  }, [dynamicFonts]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ alt: "", title: "", caption: "", width: "", borderRadius: "" });
  const [modalCallback, setModalCallback] = useState(null);
  const [alertConfig, setAlertConfig] = useState({ isOpen: false, message: "" });

  const openAltModal = (initialData, callback) => {
    setModalData({
      alt: initialData.alt || "",
      title: initialData.title || "",
      caption: initialData.caption || "",
      width: initialData.width || "",
      borderRadius: initialData.borderRadius || ""
    });
    setModalCallback(() => callback);
    setIsModalOpen(true);
  };

  const showAlert = (message) => {
    setAlertConfig({ isOpen: true, message });
  };

  const handleModalSubmit = (e) => {
    if (e) e.preventDefault();
    if (modalCallback) modalCallback(modalData);
    setIsModalOpen(false);
  };

  const updateResizerRect = useCallback(() => {
    const img = selectedImageRef.current;
    if (img && containerRef.current && img.isConnected) {
      try {
        const imgRect = img.getBoundingClientRect();
        const wrapperRect = containerRef.current.getBoundingClientRect();
        setResizerRect({
          top: imgRect.top - wrapperRect.top,
          left: imgRect.left - wrapperRect.left,
          width: imgRect.width,
          height: imgRect.height
        });
      } catch (e) {
        setResizerRect(null);
      }
    } else {
      setResizerRect(null);
    }
  }, []);

  useEffect(() => {
    if (selectedImage) {
      updateResizerRect();
      updateCaptions();
      const resizeObserver = new ResizeObserver(() => {
        updateResizerRect();
        updateCaptions();
      });
      resizeObserver.observe(selectedImage);
      
      const handleResize = () => {
        updateResizerRect();
        updateCaptions();
      };
      
      window.addEventListener('resize', handleResize);
      const quill = editorRef.current?.getEditor();
      if (quill) {
        quill.root.addEventListener('scroll', handleResize);
      }
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('resize', handleResize);
        if (quill) {
          quill.root.removeEventListener('scroll', handleResize);
        }
      };
    } else {
      setResizerRect(null);
    }
  }, [selectedImage, updateResizerRect, updateCaptions]);

  useEffect(() => {
    if (!isReady || !containerRef.current) return;

    const handleContainerClick = (ev) => {
      // If clicking inside the resizer overlay or wrap toolbar, do not deselect
      if (resizerOverlayRef.current && resizerOverlayRef.current.contains(ev.target)) {
        return;
      }

      const img = ev.target.closest && ev.target.closest('img');
      const quill = editorRef.current?.getEditor();
      if (!quill) return;

      if (img && quill.root.contains(img)) {
        selectedImageRef.current = img;
        setSelectedImage(img);
        setImageWrapMode(img.getAttribute('data-wrap') || 'none');
        return;
      }

      // Clicked outside image — deselect
      if (selectedImageRef.current) {
        selectedImageRef.current = null;
        setSelectedImage(null);
        setImageWrapMode('none');
        setTimeout(updateCaptions, 50);
      }
    };

    const handleContainerDblClick = (ev) => {
      const img = ev.target.closest && ev.target.closest('img');
      const quill = editorRef.current?.getEditor();
      if (!quill || !img || !quill.root.contains(img)) return;
      openAltModal(
        { 
          alt: img.getAttribute('alt') || '', 
          title: img.getAttribute('title') || '',
          caption: img.hasAttribute('data-caption') ? (img.getAttribute('data-caption') || '') : (img.getAttribute('title') || ''),
          borderRadius: img.style.borderRadius || img.getAttribute("data-border-radius") || ""
        },
        (newData) => {
          const blot = Quill.find(img);
          if (blot) {
            const index = quill.getIndex(blot);
            quill.formatText(index, 1, 'alt', newData.alt, 'user');
            quill.formatText(index, 1, 'title', newData.title, 'user');
            quill.formatText(index, 1, 'caption', newData.caption, 'user');
            quill.formatText(index, 1, 'borderRadius', newData.borderRadius || '', 'user');
            quill.update('user');
            setTimeout(updateCaptions, 50);
          }
        }
      );
    };

    const container = containerRef.current;
    container.addEventListener('click', handleContainerClick);
    container.addEventListener('dblclick', handleContainerDblClick);
    containerClickRef.current = handleContainerClick;

    return () => {
      container.removeEventListener('click', handleContainerClick);
      container.removeEventListener('dblclick', handleContainerDblClick);
    };
  }, [isReady]);

  const fileInputRef = useRef(null);

  const customModules = React.useMemo(() => {
    if (!modules) return null;
    const mods = { ...modules };
    if (mods.toolbar && Array.isArray(mods.toolbar)) {
      const imageGroup = mods.toolbar.find(group => Array.isArray(group) && group.includes('image'));
      if (imageGroup && !imageGroup.includes('image-settings')) {
        imageGroup.push('image-settings');
      }
    }
    mods.toolbar = {
      container: modules.toolbar,
      handlers: {
        more: function () {
          const toolbarEl = this.container || this.quill.root.parentNode.querySelector('.ql-toolbar');
          if (toolbarEl) {
            toolbarEl.classList.toggle('ql-toolbar-expanded');
          }
        },
        image: function () {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        },
        'image-settings': function () {
          const quill = this.quill;
          const currentImg = selectedImageRef.current;
          
          if (currentImg) {
            const currentData = {
              alt: currentImg.getAttribute("alt") || "",
              title: currentImg.getAttribute("title") || "",
              caption: currentImg.hasAttribute('data-caption') ? (currentImg.getAttribute('data-caption') || '') : (currentImg.getAttribute('title') || ''),
              borderRadius: currentImg.style.borderRadius || currentImg.getAttribute("data-border-radius") || ""
            };
            openAltModal(currentData, (newData) => {
              const blot = Quill.find(currentImg);
              if (blot) {
                const index = quill.getIndex(blot);
                quill.formatText(index, 1, 'alt', newData.alt, 'user');
                quill.formatText(index, 1, 'title', newData.title, 'user');
                quill.formatText(index, 1, 'caption', newData.caption, 'user');
                quill.formatText(index, 1, 'borderRadius', newData.borderRadius || '', 'user');
                quill.update('user');
                setTimeout(updateCaptions, 50);
              }
            });
            return;
          }

          const range = quill.getSelection();
          if (range) {
            const [leaf] = quill.getLeaf(range.index);
            if (leaf && leaf.domNode.tagName === 'IMG') {
              const img = leaf.domNode;
              const currentData = {
                alt: img.getAttribute("alt") || "",
                title: img.getAttribute("title") || "",
                caption: img.hasAttribute('data-caption') ? (img.getAttribute('data-caption') || '') : (img.getAttribute('title') || ''),
                borderRadius: img.style.borderRadius || img.getAttribute("data-border-radius") || ""
              };
              openAltModal(currentData, (newData) => {
                const blot = Quill.find(img);
                if (blot) {
                  const index = quill.getIndex(blot);
                  quill.formatText(index, 1, 'alt', newData.alt, 'user');
                  quill.formatText(index, 1, 'title', newData.title, 'user');
                  quill.formatText(index, 1, 'caption', newData.caption, 'user');
                  quill.formatText(index, 1, 'borderRadius', newData.borderRadius || '', 'user');
                  quill.update('user');
                  quill.setSelection(range);
                  setTimeout(updateCaptions, 50);
                }
              });
              return;
            }
          }
          showAlert("Vui lòng chọn một hình ảnh trước khi chỉnh sửa thuộc tính.");
        },
        color: function (value) {
          if (value === 'custom-color') {
            let picker = document.getElementById('quill-custom-color-picker');
            if (!picker) {
              picker = document.createElement('input');
              picker.id = 'quill-custom-color-picker';
              picker.type = 'color';
              picker.style.position = 'absolute';
              picker.style.width = '1px';
              picker.style.height = '1px';
              picker.style.opacity = '0';
              picker.style.pointerEvents = 'none';
              document.body.appendChild(picker);
            }
            // Định vị input ẩn ngay dưới nút bấm để hộp thoại màu của trình duyệt mở đúng vị trí dưới nút màu
            const expandedPicker = document.querySelector('.ql-color.ql-expanded');
            if (expandedPicker) {
              const rect = expandedPicker.getBoundingClientRect();
              picker.style.top = `${rect.top + window.scrollY}px`;
              picker.style.left = `${rect.left + window.scrollX}px`;
            }
            const currentFormat = this.quill.getFormat();
            if (currentFormat && currentFormat.color && currentFormat.color.startsWith('#')) {
              picker.value = currentFormat.color;
            }
            picker.onchange = () => {
              this.quill.format('color', picker.value);
            };
            picker.click();
          } else {
            this.quill.format('color', value);
          }
        },
        background: function (value) {
          if (value === 'custom-color') {
            let picker = document.getElementById('quill-custom-bg-picker');
            if (!picker) {
              picker = document.createElement('input');
              picker.id = 'quill-custom-bg-picker';
              picker.type = 'color';
              picker.style.position = 'absolute';
              picker.style.width = '1px';
              picker.style.height = '1px';
              picker.style.opacity = '0';
              picker.style.pointerEvents = 'none';
              document.body.appendChild(picker);
            }
            // Định vị input ẩn ngay dưới nút bấm để hộp thoại màu của trình duyệt mở đúng vị trí dưới nút màu
            const expandedPicker = document.querySelector('.ql-background.ql-expanded');
            if (expandedPicker) {
              const rect = expandedPicker.getBoundingClientRect();
              picker.style.top = `${rect.top + window.scrollY}px`;
              picker.style.left = `${rect.left + window.scrollX}px`;
            }
            const currentFormat = this.quill.getFormat();
            if (currentFormat && currentFormat.background && currentFormat.background.startsWith('#')) {
              picker.value = currentFormat.background;
            }
            picker.onchange = () => {
              this.quill.format('background', picker.value);
            };
            picker.click();
          } else {
            this.quill.format('background', value);
          }
        }
      }
    };
    return mods;
  }, [modules]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const quill = editorRef.current?.getEditor();
    if (!quill) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch(`${URL_API}api/upload/image`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (result.uploaded) {
        const range = quill.getSelection(true);
        openAltModal({ alt: "", title: "", caption: "", borderRadius: "" }, (newData) => {
          quill.insertEmbed(range.index, "image", {
            src: result.url,
            alt: newData.alt,
            title: newData.title,
            caption: newData.caption,
            borderRadius: newData.borderRadius
          }, "user");
          quill.setSelection(range.index + 1);
        });
      } else {
        showAlert("Lỗi tải ảnh");
      }
    } catch (error) {
      console.error(error);
      showAlert("Lỗi kết nối");
    } finally {
      e.target.value = "";
    }
  };

  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    const img = selectedImageRef.current;
    if (!img) return;

    const startX = e.clientX;
    
    // Use getBoundingClientRect().width to get the rendered width (including borders for border-box sizing)
    const initialRect = img.getBoundingClientRect();
    const startWidth = initialRect.width;
    const startHeight = initialRect.height;
    const aspectRatio = startWidth / startHeight;
    const containerWidth = containerRef.current.clientWidth;

    // Get initial positions relative to the container once
    const imgRect = img.getBoundingClientRect();
    const wrapperRect = containerRef.current.getBoundingClientRect();
    const startTop = imgRect.top - wrapperRect.top;
    const startLeft = imgRect.left - wrapperRect.left;

    const isRight = direction.includes('right');
    const isLeft = direction.includes('left');
    const isTop = direction.includes('top');

    // Keep track of the active width to avoid reading clientWidth (which excludes border widths under border-box)
    let currentWidth = startWidth;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      let newWidth = isRight ? startWidth + deltaX : startWidth - deltaX;
      newWidth = Math.max(50, Math.min(newWidth, containerWidth));
      
      currentWidth = newWidth;
      const newHeight = newWidth / aspectRatio;
      
      let newLeft = startLeft;
      if (isLeft) {
        newLeft = startLeft + (startWidth - newWidth);
      }
      
      let newTop = startTop;
      if (isTop) {
        newTop = startTop + (startHeight - newHeight);
      }
      
      img.style.width = `${newWidth}px`;
      img.style.height = 'auto';
      
      if (resizerOverlayRef.current) {
        resizerOverlayRef.current.style.top = `${newTop}px`;
        resizerOverlayRef.current.style.left = `${newLeft}px`;
        resizerOverlayRef.current.style.width = `${newWidth}px`;
        resizerOverlayRef.current.style.height = `${newHeight}px`;
      }
      updateCaptions();
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      const percentageWidth = Math.round((currentWidth / containerWidth) * 100);
      const widthValue = percentageWidth >= 95 ? "100%" : `${Math.round(currentWidth)}px`;
      
      img.style.width = widthValue;
      img.setAttribute('width', widthValue);
      
      const quill = editorRef.current?.getEditor();
      const currentImg = selectedImageRef.current;
      
      if (quill && currentImg) {
        const blot = Quill.find(currentImg);
        if (blot) {
          const index = quill.getIndex(blot);
          quill.formatText(index, 1, 'width', widthValue, 'user');
          quill.setSelection(index, 1, 'user');
        }
      }
      
      updateResizerRect();
      updateCaptions();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleImageWrap = useCallback((mode) => {
    const img = selectedImageRef.current;
    if (!img) return;
    const quill = editorRef.current?.getEditor();
    if (!quill) return;

    // Apply wrap style via the blot
    const blot = Quill.find(img);
    if (blot) {
      const index = quill.getIndex(blot);
      quill.formatText(index, 1, 'wrap', mode, 'user');
      quill.update('user');
    }
    setImageWrapMode(mode);
    // Re-calculate resizer position after layout change
    setTimeout(() => updateResizerRect(), 50);
  }, [updateResizerRect]);

  const renderModals = () => {
    if (!isMounted) return null;
    return (
      <>
        <Modal 
          isOpen={alertConfig.isOpen} 
          onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
          title="Thông báo"
          maxWidth="max-w-sm"
        >
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">{alertConfig.message}</p>
            <Button
              onClick={() => setAlertConfig({ ...alertConfig, isOpen: false })}
              className="w-full py-4 bg-primary text-white text-sm font-bold rounded-2xl hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-blue-100"
            >
              Đã hiểu
            </Button>
          </div>
        </Modal>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Thông tin hình ảnh"
          maxWidth="max-w-md"
        >
          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Mô tả ảnh (SEO - Thẻ Alt)</label>
              <Input
                size="lg"
                autoFocus
                placeholder="Ví dụ: phòng học cho thuê đà nẵng..."
                className="!border-gray-300 focus:!border-primary !bg-white"
                labelProps={{ className: "hidden" }}
                value={modalData.alt}
                onChange={(e) => setModalData({ ...modalData, alt: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Hiển thị khi hover chuột (Thẻ Title)</label>
              <Input
                size="lg"
                placeholder="Ví dụ: Di chuột vào ảnh sẽ hiện dòng chữ này..."
                className="!border-gray-300 focus:!border-primary !bg-white"
                labelProps={{ className: "hidden" }}
                value={modalData.title}
                onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Chú thích hiển thị dưới ảnh</label>
              <Input
                size="lg"
                placeholder="Ví dụ: Không gian phòng học hiện đại..."
                className="!border-gray-300 focus:!border-primary !bg-white"
                labelProps={{ className: "hidden" }}
                value={modalData.caption}
                onChange={(e) => setModalData({ ...modalData, caption: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-navy-700 uppercase tracking-widest mb-3 ml-1">Bo góc ảnh (ví dụ: 8px, 16px, 50%)</label>
              <Input
                size="lg"
                placeholder="Ví dụ: 12px hoặc 24px..."
                className="!border-gray-300 focus:!border-primary !bg-white"
                labelProps={{ className: "hidden" }}
                value={modalData.borderRadius || ""}
                onChange={(e) => setModalData({ ...modalData, borderRadius: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleModalSubmit()}
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-4 border-2 border-gray-100 text-gray-500 text-sm font-bold rounded-2xl hover:bg-gray-50 hover:text-red-500 transition-all active:scale-95"
              >
                Hủy bỏ
              </button>
              <Button
                type="button"
                onClick={() => handleModalSubmit()}
                className="flex-1 px-6 py-4 bg-primary text-white text-sm font-bold rounded-2xl hover:bg-blue-600 shadow-xl shadow-blue-100 transition-all active:scale-95"
              >
                Xác nhận
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  };

  if (!isReady) return <div className="h-48 bg-gray-50 animate-pulse rounded-xl" />;

  return (
    <div className="quill-wrapper-container relative" ref={containerRef}>
      {renderModals()}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileUpload}
      />
      {!modules ? (
        <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Đang khởi tạo trình soạn thảo...</span>
          </div>
        </div>
      ) : (
        <ReactQuill
          key={dynamicFonts.map(f => f.name).join(',')}
          ref={editorRef}
          {...props}
          modules={customModules}
          formats={props.formats || FORMATS}
        />
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Custom Color Picker dropdown overrides */
        .ql-snow .ql-picker-options {
          z-index: 100 !important;
        }
        .ql-snow .ql-color-picker.ql-expanded .ql-picker-options,
        .ql-snow .ql-background-picker.ql-expanded .ql-picker-options {
          width: 152px !important;
          padding: 8px !important;
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 3px !important;
          z-index: 100 !important;
        }
        .ql-snow .ql-color-picker .ql-picker-options .ql-picker-item,
        .ql-snow .ql-background-picker .ql-picker-options .ql-picker-item {
          width: 16px !important;
          height: 16px !important;
          margin: 0 !important;
          border-radius: 3px !important;
          border: 1px solid rgba(0,0,0,0.1) !important;
          float: none !important;
          display: block !important;
        }
        .ql-snow .ql-color-picker .ql-picker-options [data-value="custom-color"],
        .ql-snow .ql-background-picker .ql-picker-options [data-value="custom-color"] {
          background: linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff) !important;
          width: 100% !important;
          height: 24px !important;
          border: 1px solid #d1d5db !important;
          border-radius: 6px !important;
          margin-top: 6px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          position: relative !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
          transition: all 0.2s ease !important;
        }
        .ql-snow .ql-color-picker .ql-picker-options [data-value="custom-color"]:hover,
        .ql-snow .ql-background-picker .ql-picker-options [data-value="custom-color"]:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
          border-color: #9ca3af !important;
        }
        .ql-snow .ql-color-picker .ql-picker-options [data-value="custom-color"]::after,
        .ql-snow .ql-background-picker .ql-picker-options [data-value="custom-color"]::after {
          content: "Tự chọn màu" !important;
          font-family: 'Inter', sans-serif !important;
          font-size: 10px !important;
          color: white !important;
          text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.9) !important;
          font-weight: 700 !important;
          letter-spacing: 0.5px !important;
          text-transform: uppercase !important;
          pointer-events: none !important;
          white-space: nowrap !important;
        }

        .ql-editor {
          font-family: 'Inter', sans-serif;
          font-size: 1.05rem;
          line-height: 1.6;
          padding: 24px !important;
          min-height: inherit;
        }
        .ql-editor p {
          margin-bottom: 0.5rem;
        }
        .quill-wrapper-container {
          position: relative !important;
          overflow: visible !important;
          container-type: inline-size !important;
          container-name: quill-container !important;
        }
        .quill-wrapper-container:focus-within,
        .quill-wrapper-container:has(.ql-expanded) {
          z-index: 50 !important;
        }
        
        /* Default toolbar options behavior (desktop, width > 900px) */
        .ql-toolbar.ql-snow .ql-formats .ql-more {
          display: none !important;
        }
        .ql-toolbar.ql-snow .ql-more-formats-group {
          display: inline-block !important;
          margin-right: 0 !important;
          vertical-align: middle !important;
        }
        .ql-toolbar.ql-snow .ql-more-dropdown {
          display: contents !important;
        }
        .ql-toolbar.ql-snow .ql-more-dropdown > .ql-formats {
          margin-right: 15px !important;
          display: inline-block !important;
          float: none !important;
          vertical-align: middle !important;
        }

        /* Responsive mode (width <= 900px) */
        @container quill-container (max-width: 900px) {
          .ql-toolbar.ql-snow .ql-formats .ql-more {
            display: inline-block !important;
          }
          .ql-toolbar.ql-snow .ql-more-formats-group {
            position: relative !important;
            overflow: visible !important;
            display: inline-block !important;
            vertical-align: middle !important;
          }
          
          /* Style dropdown panel as a floating select menu */
          .ql-toolbar.ql-snow .ql-more-dropdown {
            display: none !important;
            position: absolute !important;
            top: calc(100% + 6px) !important;
            right: 0 !important;
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 12px !important;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
            padding: 10px 14px !important;
            z-index: 9999 !important;
            min-width: 330px !important;
            max-width: 450px !important;
            flex-wrap: wrap !important;
            gap: 8px !important;
            justify-content: start !important;
            align-items: center !important;
          }

          /* Show dropdown when expanded */
          .ql-toolbar.ql-snow.ql-toolbar-expanded .ql-more-dropdown {
            display: flex !important;
            animation: ql-fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }

          /* Reset margins inside dropdown and lay out in a clean row with border dividers */
          .ql-toolbar.ql-snow .ql-more-dropdown > .ql-formats {
            margin-right: 0 !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 4px !important;
            border-right: 1px solid #f1f5f9 !important;
            padding-right: 8px !important;
          }

          .ql-toolbar.ql-snow .ql-more-dropdown > .ql-formats:last-child {
            border-right: none !important;
            padding-right: 0 !important;
          }
        }

        .ql-toolbar.ql-snow.ql-toolbar-expanded .ql-more {
          color: #1A94FF !important;
        }

        @keyframes ql-fade-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid #f1f5f9 !important;
          padding: 12px !important;
          background: #f8fafc !important;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          position: relative !important;
          z-index: 10 !important;
          overflow: visible !important;
        }
        .ql-toolbar.ql-snow:focus-within,
        .ql-toolbar.ql-snow:has(.ql-expanded) {
          z-index: 50 !important;
        }
        .ql-container.ql-snow {
          border: none !important;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
        }
        .ql-editor img {
          cursor: pointer;
          transition: border-color 0.2s ease;
          border: 4px solid transparent;
          display: inline-block;
          max-width: 100%;
        }
        .ql-editor img:hover {
          border-color: rgba(26, 148, 255, 0.3);
        }
        .ql-snow .ql-picker.ql-font {
          width: 160px !important;
        }
        .ql-snow .ql-picker.ql-header {
          width: 120px !important;
        }
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"],
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="4"],
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="5"],
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="6"] {
          display: block !important;
        }
        .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="3"]::before,
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before { content: 'Heading 3' !important; }
        .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="4"]::before,
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="4"]::before { content: 'Heading 4' !important; }
        .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="5"]::before,
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="5"]::before { content: 'Heading 5' !important; }
        .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="6"]::before,
        .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="6"]::before { content: 'Heading 6' !important; }

        .ql-snow .ql-picker.ql-font .ql-picker-options {
          max-height: 250px !important;
          overflow-y: auto !important;
          padding-top: 0 !important;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-item {
          padding: 8px 12px !important;
          display: block !important;
          width: 100% !important;
        }
        .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="macdinh"]::before,
        .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="macdinh"]::before { 
          content: 'Mặc định (Inter)' !important; 
          font-family: 'Inter', sans-serif !important;
        }
        ${dynamicFonts.map(font => `
          .ql-snow .ql-picker.ql-font .ql-picker-label[data-value="${font.slug}"]::before,
          .ql-snow .ql-picker.ql-font .ql-picker-item[data-value="${font.slug}"]::before { 
            content: '${font.name}' !important; 
            font-family: '${font.family}', sans-serif !important;
          }
        `).join('\n')}
        .ql-snow .ql-picker.ql-size .ql-picker-label:not([data-value])::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item:not([data-value])::before { content: 'Normal' !important; }
        
        ${Object.entries(SIZE_MAP).map(([label, value]) => `
          .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="${value}"]::before,
          .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="${value}"]::before { 
            content: '${label}' !important; 
          }
        `).join('\n')}
        .ql-editor h1, .ql-editor h2, .ql-editor h3, .ql-editor h4, .ql-editor h5, .ql-editor h6 { 
          line-height: 1.2; 
          margin-bottom: 0.5rem;
        }
        .ql-editor h1 { font-size: 2.5rem; }
        .ql-editor h2 { font-size: 2rem; }
        .ql-editor h3 { font-size: 1.75rem; }
        .ql-editor h4 { font-size: 1.5rem; }
        .ql-editor h5 { font-size: 1.25rem; }
        .ql-editor h6 { font-size: 1rem; }
        .resizer-handle {
          position: absolute;
          width: 24px;
          height: 24px;
          background: white;
          border: 2px solid #1A94FF;
          border-radius: 50%;
          pointer-events: auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 2001;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .resizer-handle:hover {
          transform: scale(1.1);
          background: #f0f7ff;
        }
        /* Text Wrapping Toolbar */
        .wrap-toolbar {
          position: absolute;
          top: -44px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 4px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 4px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          z-index: 2002;
          pointer-events: auto;
        }
        .wrap-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1.5px solid transparent;
          border-radius: 6px;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.15s ease;
          color: #64748b;
        }
        .wrap-btn:hover {
          background: #e2e8f0;
          color: #334155;
        }
        .wrap-btn.active {
          background: #dbeafe;
          border-color: #3b82f6;
          color: #1d4ed8;
        }
        .wrap-btn svg {
          width: 18px;
          height: 18px;
        }
        /* Text wrapping styles in editor */
        .ql-editor img[data-wrap="left"] {
          float: left !important;
          margin-right: 20px !important;
          margin-bottom: 16px !important;
          margin-top: 6px !important;
          display: inline !important;
        }
        .ql-editor img[data-wrap="right"] {
          float: right !important;
          margin-left: 20px !important;
          margin-bottom: 16px !important;
          margin-top: 6px !important;
          display: inline !important;
        }
        .ql-editor img[data-wrap="none"] {
          float: none !important;
          display: block !important;
          margin-left: auto !important;
          margin-right: auto !important;
          margin-top: 20px !important;
        }
        .ql-editor img[data-wrap="left"] + br,
        .ql-editor img[data-wrap="right"] + br {
          clear: both !important;
        }
        /* Image Caption styling in editor */
        .ql-editor img[data-caption]:not([data-caption=""]):not([data-caption=" "]) {
          margin-bottom: 36px !important;
        }
        .ql-editor img:not([data-caption])[title]:not([title=""]):not([title=" "]) {
          margin-bottom: 36px !important;
        }
        .editor-image-caption {
          position: absolute !important;
          text-align: center !important;
          font-size: 13px !important;
          color: #666666 !important;
          font-style: italic !important;
          line-height: 1.4 !important;
          pointer-events: none !important;
          z-index: 10 !important;
          display: block !important;
          box-sizing: border-box !important;
          padding: 0 4px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
        }
      `}} />

      {resizerRect && (
        <div 
          ref={resizerOverlayRef}
          className="absolute"
          style={{
            top: resizerRect.top,
            left: resizerRect.left,
            width: resizerRect.width,
            height: resizerRect.height,
            border: '2px solid #1A94FF',
            boxShadow: '0 0 10px rgba(26, 148, 255, 0.3)',
            pointerEvents: 'none',
            zIndex: 2000,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Text Wrapping Toolbar */}
          <div className="wrap-toolbar" onMouseDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={`wrap-btn${imageWrapMode === 'left' ? ' active' : ''}`}
              title="Chữ bao quanh - Trái"
              onClick={(e) => { e.stopPropagation(); handleImageWrap('left'); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="8" height="8" rx="1" fill="currentColor" opacity="0.15" stroke="currentColor"/>
                <line x1="14" y1="4" x2="21" y2="4"/>
                <line x1="14" y1="8" x2="21" y2="8"/>
                <line x1="3" y1="14" x2="21" y2="14"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <button
              type="button"
              className={`wrap-btn${imageWrapMode === 'none' ? ' active' : ''}`}
              title="Căn giữa - Không bao quanh"
              onClick={(e) => { e.stopPropagation(); handleImageWrap('none'); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="4" x2="21" y2="4"/>
                <rect x="7" y="8" width="10" height="7" rx="1" fill="currentColor" opacity="0.15" stroke="currentColor"/>
                <line x1="3" y1="19" x2="21" y2="19"/>
              </svg>
            </button>
            <button
              type="button"
              className={`wrap-btn${imageWrapMode === 'right' ? ' active' : ''}`}
              title="Chữ bao quanh - Phải"
              onClick={(e) => { e.stopPropagation(); handleImageWrap('right'); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="13" y="3" width="8" height="8" rx="1" fill="currentColor" opacity="0.15" stroke="currentColor"/>
                <line x1="3" y1="4" x2="10" y2="4"/>
                <line x1="3" y1="8" x2="10" y2="8"/>
                <line x1="3" y1="14" x2="21" y2="14"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Resize Handles */}
          {[
            { dir: 'top-left', cursor: 'nwse-resize', style: { top: -12, left: -12 } },
            { dir: 'top-right', cursor: 'nesw-resize', style: { top: -12, right: -12 } },
            { dir: 'bottom-left', cursor: 'nesw-resize', style: { bottom: -12, left: -12 } },
            { dir: 'bottom-right', cursor: 'nwse-resize', style: { bottom: -12, right: -12 } }
          ].map((handle) => (
            <div 
              key={handle.dir}
              className="resizer-handle"
              style={{ ...handle.style, cursor: handle.cursor }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleResizeStart(e, handle.dir);
              }}
            />
          ))}
        </div>
      )}

      {captions.map((cap, idx) => (
        <div
          key={idx}
          className="editor-image-caption"
          style={{
            top: cap.top + 6,
            left: cap.left,
            width: cap.width,
          }}
        >
          {cap.text}
        </div>
      ))}
    </div>
  );
});

QuillWrapper.displayName = "QuillWrapper";
export default QuillWrapper;
