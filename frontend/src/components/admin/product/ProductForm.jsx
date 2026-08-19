"use client";

/* global process */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Typography,
} from "@material-tailwind/react";
import dynamic from "next/dynamic";
import PropTypes from "prop-types";
import { FaExclamationTriangle } from "react-icons/fa";
import { MdSave, MdClose } from "react-icons/md";
import {
  clearProductGalleryDraft,
  getProductGalleryDraftKey,
  loadProductGalleryDraft,
  saveProductGalleryDraft,
} from "@/utils/productGalleryDraft";
import {
  normalizeResponsiveLineHeightStyles,
  stripTopLevelResponsiveControls,
} from "@/utils/richTextControls";

const QuillWrapper = dynamic(
  () => import("@/views/admin/QuillWrapper"),
  { ssr: false }
);
import "react-quill-new/dist/quill.snow.css";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:8080/";

const DEFAULT_ROOM_FONT_SIZE = "16";
const DEFAULT_ROOM_FONT_SIZE_MOBILE = "12";
const DEFAULT_ROOM_NAME_FONT_SIZE = "35";
const DEFAULT_ROOM_NAME_FONT_SIZE_MOBILE = "20";
const PRODUCT_TEXT_DRAFT_VERSION = 2;

const getProductTextDraftKey = (productId) => `product-text-draft:${productId || "new"}`;

const loadProductTextDraft = (key) => {
  if (typeof window === "undefined") return null;

  try {
    const value = window.sessionStorage.getItem(key);
    if (!value) return null;

    const draft = JSON.parse(value);
    if (
      draft?.version !== PRODUCT_TEXT_DRAFT_VERSION ||
      !draft.base ||
      !draft.fields
    ) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    return draft;
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
};

const saveProductTextDraft = (key, draft) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify(draft));
  } catch (error) {
    console.error("Unable to save product text draft", error);
  }
};

const clearProductTextDraft = (key) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(key);
};

const pendingQuillMounts = [];
let quillMountInProgress = false;

const flushQuillMountQueue = () => {
  if (quillMountInProgress || pendingQuillMounts.length === 0) return;

  quillMountInProgress = true;
  const mountNext = pendingQuillMounts.shift();

  window.setTimeout(() => {
    mountNext?.();
    window.setTimeout(() => {
      quillMountInProgress = false;
      flushQuillMountQueue();
    }, 350);
  }, 0);
};

const enqueueQuillMount = (mount) => {
  pendingQuillMounts.push(mount);
  flushQuillMountQueue();

  return () => {
    const index = pendingQuillMounts.indexOf(mount);
    if (index >= 0) pendingQuillMounts.splice(index, 1);
  };
};

const getPlainText = (html) => {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const toCssUnit = (value, allowNegative = false) => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/p$/i.test(text) && !/px$/i.test(text)) return "";
  const pattern = allowNegative
    ? /^-?(?:\d+(?:\.\d+)?|\.\d+)$/
    : /^(?:\d+(?:\.\d+)?|\.\d+)$/;
  return pattern.test(text) ? `${text}px` : text;
};

const stripCssUnit = (value) => String(value || "").trim().replace(/px$/i, "");

const extractResponsiveControls = (html) => {
  const empty = {
    fontSize: "",
    fontSizeMobile: "",
    lineHeight: "",
    lineHeightMobile: "",
    translateY: "",
    translateYMobile: "",
  };
  if (!html || typeof window === "undefined") return empty;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  const lineHeightStyled = root?.querySelector("[style*='--custom-line-height'], [style*='line-height']");
  const inlineStyled = root?.querySelector("[style*='--fs'], [style*='--translate-y']");
  if (!lineHeightStyled && !inlineStyled) return empty;

  return {
    fontSize: stripCssUnit(inlineStyled?.style.getPropertyValue("--fs-desktop")),
    fontSizeMobile: stripCssUnit(inlineStyled?.style.getPropertyValue("--fs-mobile")),
    lineHeight: stripCssUnit(
      lineHeightStyled?.style.getPropertyValue("--custom-line-height") || lineHeightStyled?.style.getPropertyValue("line-height")
    ),
    lineHeightMobile: stripCssUnit(lineHeightStyled?.style.getPropertyValue("--custom-line-height-mobile")),
    translateY: stripCssUnit(inlineStyled?.style.getPropertyValue("--translate-y")),
    translateYMobile: stripCssUnit(inlineStyled?.style.getPropertyValue("--translate-y-mobile")),
  };
};

const decorateRichTextWithControls = (html, controls = {}) => {
  if (!html || typeof window === "undefined") return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  let controlsRoot =
    root.children.length === 1 &&
    root.firstElementChild instanceof HTMLElement &&
    root.firstElementChild.matches("[data-rich-text-controls]")
      ? root.firstElementChild
      : null;

  if (!controlsRoot) {
    controlsRoot = doc.createElement("div");
    controlsRoot.setAttribute("data-rich-text-controls", "true");
    while (root.firstChild) {
      controlsRoot.appendChild(root.firstChild);
    }
    root.appendChild(controlsRoot);
  }

  const lineHeightEntries = [
    ["--custom-line-height", toCssUnit(controls.lineHeight)],
    ["--custom-line-height-mobile", toCssUnit(controls.lineHeightMobile)],
  ];
  const inlineEntries = [
    ["--fs-desktop", toCssUnit(controls.fontSize)],
    ["--fs-mobile", toCssUnit(controls.fontSizeMobile)],
    ["--translate-y", toCssUnit(controls.translateY, true)],
    ["--translate-y-mobile", toCssUnit(controls.translateYMobile, true)],
  ];

  lineHeightEntries.forEach(([name, value]) => {
    if (value) {
      controlsRoot.style.setProperty(name, value);
    } else {
      controlsRoot.style.removeProperty(name);
    }
  });
  controlsRoot.style.removeProperty("line-height");

  let targets = Array.from(controlsRoot.children).filter((node) => node instanceof HTMLElement);
  if (targets.length === 0) targets = [controlsRoot];
  targets.forEach((target) => {
    inlineEntries.forEach(([name, value]) => {
      if (value) {
        target.style.setProperty(name, value);
      } else {
        target.style.removeProperty(name);
      }
    });
    if (!target.getAttribute("style")) {
      target.removeAttribute("style");
    }
  });
  if (!controlsRoot.getAttribute("style")) controlsRoot.removeAttribute("style");

  return root.innerHTML;
};

const LazyQuillWrapper = React.memo(function LazyQuillWrapper({ minHeight = "120px", ...props }) {
  const containerRef = useRef(null);
  const cancelQueuedMountRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;
    const node = containerRef.current;
    if (!node || typeof window === "undefined") return;

    cancelQueuedMountRef.current = enqueueQuillMount(() => {
      setShouldRender(true);
    });

    return () => {
      if (cancelQueuedMountRef.current) {
        cancelQueuedMountRef.current();
      }
    };
  }, [shouldRender]);

  const previewText = getPlainText(props.value);

  return (
    <div ref={containerRef}>
      {shouldRender ? (
        <QuillWrapper minHeight={minHeight} {...props} />
      ) : (
        <button
          type="button"
          onClick={() => {
            if (cancelQueuedMountRef.current) return;
            cancelQueuedMountRef.current = enqueueQuillMount(() => {
              setShouldRender(true);
            });
          }}
          className="block w-full rounded-xl border border-gray-100 bg-gray-50/70 p-4 text-left text-sm text-gray-700 transition-colors hover:border-blue-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          style={{ minHeight }}
        >
          {previewText ? (
            <span className="line-clamp-4">{previewText}</span>
          ) : (
            <span className="text-gray-400">{props.placeholder || "Nhập nội dung..."}</span>
          )}
        </button>
      )}
    </div>
  );
}, (prevProps, nextProps) => (
  prevProps.value === nextProps.value &&
  prevProps.lineHeight === nextProps.lineHeight &&
  prevProps.lineHeightMobile === nextProps.lineHeightMobile &&
  prevProps.fontSize === nextProps.fontSize &&
  prevProps.fontSizeMobile === nextProps.fontSizeMobile &&
  prevProps.translateY === nextProps.translateY &&
  prevProps.translateYMobile === nextProps.translateYMobile &&
  prevProps.className === nextProps.className &&
  prevProps.placeholder === nextProps.placeholder &&
  prevProps.minHeight === nextProps.minHeight &&
  prevProps.hasResponsiveFontSize === nextProps.hasResponsiveFontSize &&
  prevProps.inlineSelectionControls === nextProps.inlineSelectionControls &&
  prevProps.commitOnBlurOnly === nextProps.commitOnBlurOnly &&
  prevProps.theme === nextProps.theme
));

LazyQuillWrapper.propTypes = {
  minHeight: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.string,
};

export default function ProductForm(props) {
  const { dataEdit, onSave, onCancel, id } = props;
  const [showScrollTop, setShowScrollTop] = useState(false);
  const showScrollTopRef = useRef(false);

  useEffect(() => {
    let frameId = null;

    const handleScroll = () => {
      if (frameId !== null) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        let isScrolled = window.scrollY > 300;
        if (!isScrolled) {
          const scrollable = document.querySelector("main, .overflow-y-auto");
          if (scrollable) {
            isScrolled = scrollable.scrollTop > 300;
          }
        }

        if (showScrollTopRef.current !== isScrolled) {
          showScrollTopRef.current = isScrolled;
          setShowScrollTop(isScrolled);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const scrollContainers = document.querySelectorAll("main, .overflow-y-auto, #root, body");
    scrollContainers.forEach((el) => {
      el.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const [roomName, setRoomName] = useState("");
  const [roomNameRich, setRoomNameRich] = useState("");
  const [roomSlug, setRoomSlug] = useState("");
  const [roomContent, setRoomContent] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomEquipment, setRoomEquipment] = useState("");
  const [roomPrice, setRoomPrice] = useState("");
  const [isTextContentInitialized, setIsTextContentInitialized] = useState(!id);
  const [isChecked, setIsChecked] = useState(false);
  const [isStatus, setIsStatus] = useState(true);
  const [singleImage, setSingleImage] = useState(null);
  const [multipleImages, setMultipleImages] = useState([]);
  const [galleryDraftStatus, setGalleryDraftStatus] = useState("idle");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoImage, setSeoImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [roomLineHeight, setRoomLineHeight] = useState("");
  const [roomLineHeightMobile, setRoomLineHeightMobile] = useState("");
  const [roomFontSize, setRoomFontSize] = useState(DEFAULT_ROOM_FONT_SIZE);
  const [roomFontSizeMobile, setRoomFontSizeMobile] = useState(DEFAULT_ROOM_FONT_SIZE_MOBILE);
  const [roomPriceFontSize, setRoomPriceFontSize] = useState(DEFAULT_ROOM_FONT_SIZE);
  const [roomPriceFontSizeMobile, setRoomPriceFontSizeMobile] = useState(DEFAULT_ROOM_FONT_SIZE_MOBILE);
  const [roomPriceLineHeight, setRoomPriceLineHeight] = useState("");
  const [roomPriceLineHeightMobile, setRoomPriceLineHeightMobile] = useState("");
  const [roomPriceTranslateY, setRoomPriceTranslateY] = useState("");
  const [roomPriceTranslateYMobile, setRoomPriceTranslateYMobile] = useState("");
  const [roomEquipmentFontSize, setRoomEquipmentFontSize] = useState(DEFAULT_ROOM_FONT_SIZE);
  const [roomEquipmentFontSizeMobile, setRoomEquipmentFontSizeMobile] = useState(DEFAULT_ROOM_FONT_SIZE_MOBILE);
  const [roomEquipmentLineHeight, setRoomEquipmentLineHeight] = useState("");
  const [roomEquipmentLineHeightMobile, setRoomEquipmentLineHeightMobile] = useState("");
  const [roomEquipmentTranslateY, setRoomEquipmentTranslateY] = useState("");
  const [roomEquipmentTranslateYMobile, setRoomEquipmentTranslateYMobile] = useState("");
  const [roomNameFontSize, setRoomNameFontSize] = useState(DEFAULT_ROOM_NAME_FONT_SIZE);
  const [roomNameFontSizeMobile, setRoomNameFontSizeMobile] = useState(DEFAULT_ROOM_NAME_FONT_SIZE_MOBILE);
  const [roomNameLineHeight, setRoomNameLineHeight] = useState("");
  const [roomNameLineHeightMobile, setRoomNameLineHeightMobile] = useState("");
  const [roomNameTranslateY, setRoomNameTranslateY] = useState("");
  const [roomNameTranslateYMobile, setRoomNameTranslateYMobile] = useState("");
  const [roomTranslateY, setRoomTranslateY] = useState("");
  const [roomTranslateYMobile, setRoomTranslateYMobile] = useState("");
  const roomNameRichDraftRef = useRef("");
  const roomContentDraftRef = useRef("");
  const roomPriceDraftRef = useRef("");
  const roomEquipmentDraftRef = useRef("");
  const serverTextSnapshotRef = useRef({ price: "", equipment: "" });
  const productTextDraftRef = useRef(null);
  const galleryDraftWriteRef = useRef(Promise.resolve());
  const galleryDraftKey = getProductGalleryDraftKey(id);
  const textDraftKey = getProductTextDraftKey(id);

  const persistTextDraft = useCallback((field, value) => {
    const base = serverTextSnapshotRef.current;
    const fields = {
      ...(productTextDraftRef.current?.fields || {}),
    };

    if (value === base[field]) {
      delete fields[field];
    } else {
      fields[field] = value;
    }

    if (Object.keys(fields).length === 0) {
      productTextDraftRef.current = null;
      clearProductTextDraft(textDraftKey);
      return;
    }

    const draft = {
      version: PRODUCT_TEXT_DRAFT_VERSION,
      base: { ...base },
      fields,
    };
    productTextDraftRef.current = draft;
    saveProductTextDraft(textDraftKey, draft);
  }, [textDraftKey]);

  const persistGalleryDraft = useCallback((images) => {
    const draftFiles = images.filter((image) => image instanceof File);
    setGalleryDraftStatus("saving");
    const writeOperation = galleryDraftWriteRef.current
      .catch(() => undefined)
      .then(() => saveProductGalleryDraft(galleryDraftKey, draftFiles));

    galleryDraftWriteRef.current = writeOperation;
    writeOperation
      .then(() => setGalleryDraftStatus(draftFiles.length > 0 ? "saved" : "idle"))
      .catch((error) => {
        console.error("Unable to save product gallery draft", error);
        setGalleryDraftStatus("error");
      });

    return writeOperation;
  }, [galleryDraftKey]);

  const handleSingleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSingleImage(file);
    }
    setErrors((prev) => ({ ...prev, image: "" }));
  };

  useEffect(() => {
    if (dataEdit) {
      setRoomName(dataEdit.name || "");
      setRoomNameRich(dataEdit.name_rich || (dataEdit.name ? `<h2>${dataEdit.name}</h2>` : ""));
      setRoomContent(dataEdit.content || "");
      roomNameRichDraftRef.current = dataEdit.name_rich || (dataEdit.name ? `<h2>${dataEdit.name}</h2>` : "");
      setRoomSlug(dataEdit.slug || "");
      setRoomDescription(dataEdit.description || "");
      roomContentDraftRef.current = dataEdit.content || "";

      let mergedEquipment = dataEdit.equipment || "";
      if (dataEdit.contains && dataEdit.contains.trim() && dataEdit.contains.trim() !== "0") {
        const cleanContains = dataEdit.contains.trim();
        if (cleanContains !== "<p><br></p>" && cleanContains !== "") {
          if (mergedEquipment && mergedEquipment !== "<p><br></p>" && mergedEquipment !== "") {
            mergedEquipment = `${mergedEquipment}<p></p>${cleanContains}`;
          } else {
            mergedEquipment = cleanContains;
          }
        }
      }
      const serverTextSnapshot = {
        price: dataEdit.price || "",
        equipment: mergedEquipment,
      };
      serverTextSnapshotRef.current = serverTextSnapshot;

      const storedTextDraft = loadProductTextDraft(textDraftKey);
      const validDraftFields = {};
      if (storedTextDraft) {
        for (const field of ["price", "equipment"]) {
          if (
            Object.prototype.hasOwnProperty.call(storedTextDraft.fields, field) &&
            storedTextDraft.base[field] === serverTextSnapshot[field]
          ) {
            validDraftFields[field] = storedTextDraft.fields[field];
          }
        }
      }

      const textDraft = Object.keys(validDraftFields).length > 0
        ? {
          version: PRODUCT_TEXT_DRAFT_VERSION,
          base: serverTextSnapshot,
          fields: validDraftFields,
        }
        : null;
      productTextDraftRef.current = textDraft;
      if (textDraft) {
        saveProductTextDraft(textDraftKey, textDraft);
      } else {
        clearProductTextDraft(textDraftKey);
      }

      const initialEquipment = Object.prototype.hasOwnProperty.call(validDraftFields, "equipment")
        ? validDraftFields.equipment
        : serverTextSnapshot.equipment;
      const initialPrice = Object.prototype.hasOwnProperty.call(validDraftFields, "price")
        ? validDraftFields.price
        : serverTextSnapshot.price;
      setRoomEquipment(initialEquipment);
      setRoomPrice(initialPrice);
      roomEquipmentDraftRef.current = initialEquipment;
      roomPriceDraftRef.current = initialPrice;
      setIsChecked(dataEdit.isSpecial || false);
      setIsStatus(dataEdit.status == 1);
      setSeoTitle(dataEdit.seoTitle || "");
      setSeoDescription(dataEdit.seoDescription || "");
      setSeoKeywords(dataEdit.seoKeywords || "");
      setRoomLineHeight(dataEdit.lineHeight || "");
      setRoomLineHeightMobile(dataEdit.lineHeightMobile || "");
      setRoomFontSize(dataEdit.fontSize || DEFAULT_ROOM_FONT_SIZE);
      setRoomFontSizeMobile(dataEdit.fontSizeMobile || DEFAULT_ROOM_FONT_SIZE_MOBILE);
      const priceControls = extractResponsiveControls(initialPrice);
      const equipmentControls = extractResponsiveControls(initialEquipment);
      const nameControls = extractResponsiveControls(dataEdit.name_rich || "");
      setRoomPriceFontSize(priceControls.fontSize || dataEdit.fontSize || DEFAULT_ROOM_FONT_SIZE);
      setRoomPriceFontSizeMobile(priceControls.fontSizeMobile || dataEdit.fontSizeMobile || DEFAULT_ROOM_FONT_SIZE_MOBILE);
      setRoomPriceLineHeight(priceControls.lineHeight || dataEdit.lineHeight || "");
      setRoomPriceLineHeightMobile(priceControls.lineHeightMobile || dataEdit.lineHeightMobile || "");
      setRoomPriceTranslateY(priceControls.translateY || dataEdit.translateY || "");
      setRoomPriceTranslateYMobile(priceControls.translateYMobile || dataEdit.translateYMobile || "");
      setRoomEquipmentFontSize(equipmentControls.fontSize || dataEdit.fontSize || DEFAULT_ROOM_FONT_SIZE);
      setRoomEquipmentFontSizeMobile(equipmentControls.fontSizeMobile || dataEdit.fontSizeMobile || DEFAULT_ROOM_FONT_SIZE_MOBILE);
      setRoomEquipmentLineHeight(equipmentControls.lineHeight || dataEdit.lineHeight || "");
      setRoomEquipmentLineHeightMobile(equipmentControls.lineHeightMobile || dataEdit.lineHeightMobile || "");
      setRoomEquipmentTranslateY(equipmentControls.translateY || dataEdit.translateY || "");
      setRoomEquipmentTranslateYMobile(equipmentControls.translateYMobile || dataEdit.translateYMobile || "");
      setRoomNameFontSize(dataEdit.nameFontSize || nameControls.fontSize || DEFAULT_ROOM_NAME_FONT_SIZE);
      setRoomNameFontSizeMobile(dataEdit.nameFontSizeMobile || nameControls.fontSizeMobile || DEFAULT_ROOM_NAME_FONT_SIZE_MOBILE);
      setRoomNameLineHeight(nameControls.lineHeight || dataEdit.lineHeight || "");
      setRoomNameLineHeightMobile(nameControls.lineHeightMobile || dataEdit.lineHeightMobile || "");
      setRoomNameTranslateY(nameControls.translateY || dataEdit.translateY || "");
      setRoomNameTranslateYMobile(nameControls.translateYMobile || dataEdit.translateYMobile || "");
      setRoomTranslateY(dataEdit.translateY || "");
      setRoomTranslateYMobile(dataEdit.translateYMobile || "");

      if (dataEdit.image) {
        setSingleImage(dataEdit.image.startsWith('http') ? dataEdit.image : `${URL_API}${dataEdit.image.replaceAll("\\", "/")}`);
      }
      if (dataEdit.images) {
        const images = [];
        for (const image of dataEdit.images) {
          const path = image?.image_detail || image?.image;
          if (path) {
            images.push(path.startsWith('http') ? path : `${URL_API}${path.replaceAll("\\", "/")}`);
          }
        }
        setMultipleImages(images);
      }
      if (dataEdit.seoImage) {
        setSeoImage(dataEdit.seoImage.startsWith('http') ? dataEdit.seoImage : `${URL_API}${dataEdit.seoImage.replaceAll("\\", "/")}`);
      }
      setIsTextContentInitialized(true);
    }
  }, [dataEdit, textDraftKey]);

  useEffect(() => {
    let active = true;

    loadProductGalleryDraft(galleryDraftKey)
      .then((draftFiles) => {
        if (!active || draftFiles.length === 0) return;

        setMultipleImages((currentImages) => {
          const existingDraftKeys = new Set(
            currentImages
              .filter((image) => image instanceof File)
              .map((file) => `${file.name}:${file.size}:${file.lastModified}`)
          );
          const restoredFiles = draftFiles.filter(
            (file) => !existingDraftKeys.has(`${file.name}:${file.size}:${file.lastModified}`)
          );
          return [...currentImages, ...restoredFiles];
        });
        setGalleryDraftStatus("saved");
      })
      .catch((error) => {
        if (!active) return;
        console.error("Unable to restore product gallery draft", error);
        setGalleryDraftStatus("error");
      });

    return () => {
      active = false;
    };
  }, [galleryDraftKey]);

  const handleMultipleImagesChange = (event) => {
    const files = Array.from(event.target.files);
    setMultipleImages((prev) => {
      const nextImages = [...prev, ...files];
      void persistGalleryDraft(nextImages);
      return nextImages;
    });
    event.target.value = "";
  };

  const handleRoomSlugChange = (event) => setRoomSlug(event.target.value);
  const handleStatusChange = (event) => setIsStatus(event.target.checked);
  const handleCheckboxChange = (event) => setIsChecked(event.target.checked);
  const removeSingleImage = () => setSingleImage(null);
  const removeMultipleImage = (index) => {
    setMultipleImages((prev) => {
      const nextImages = prev.filter((_, i) => i !== index);
      void persistGalleryDraft(nextImages);
      return nextImages;
    });
  };
  const handleSeoTitleChange = (event) => setSeoTitle(event.target.value);
  const handleSeoDescriptionChange = (event) => setSeoDescription(event.target.value);
  const handleSeoKeywordsChange = (event) => setSeoKeywords(event.target.value);
  const handleSeoImageChange = (event) => {
    const file = event.target.files[0];
    if (file) setSeoImage(file);
  };
  const removeSeoImage = () => setSeoImage(null);

  const validateInputs = () => {
    const newErrors = {};
    if (!roomName.trim()) newErrors.roomName = "Tên phòng không được để trống.";
    if (!roomSlug.trim()) newErrors.roomSlug = "Slug không được để trống.";
    if (!singleImage) newErrors.image = "Ảnh phòng không được để trống.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (validateInputs()) {
      const currentRoomContent = roomContentDraftRef.current ?? roomContent;
      const currentRoomNameRich = roomNameRichDraftRef.current ?? roomNameRich;
      const currentRoomPrice = roomPriceDraftRef.current ?? roomPrice;
      const currentRoomEquipment = roomEquipmentDraftRef.current ?? roomEquipment;
      const nameRich = decorateRichTextWithControls(currentRoomNameRich, {
        fontSize: roomNameFontSize,
        fontSizeMobile: roomNameFontSizeMobile,
        lineHeight: roomNameLineHeight,
        lineHeightMobile: roomNameLineHeightMobile,
        translateY: roomNameTranslateY,
        translateYMobile: roomNameTranslateYMobile,
      });
      const price = getPlainText(currentRoomPrice) ? decorateRichTextWithControls(currentRoomPrice, {
        fontSize: roomPriceFontSize,
        fontSizeMobile: roomPriceFontSizeMobile,
        lineHeight: roomPriceLineHeight,
        lineHeightMobile: roomPriceLineHeightMobile,
        translateY: roomPriceTranslateY,
        translateYMobile: roomPriceTranslateYMobile,
      }) : "";
      const equipment = getPlainText(currentRoomEquipment) ? decorateRichTextWithControls(currentRoomEquipment, {
        fontSize: roomEquipmentFontSize,
        fontSizeMobile: roomEquipmentFontSizeMobile,
        lineHeight: roomEquipmentLineHeight,
        lineHeightMobile: roomEquipmentLineHeightMobile,
        translateY: roomEquipmentTranslateY,
        translateYMobile: roomEquipmentTranslateYMobile,
      }) : "";
      const data = {
        name: roomName,
        name_rich: nameRich,
        image: singleImage,
        imageDetail: multipleImages,
        content: stripTopLevelResponsiveControls(
          normalizeResponsiveLineHeightStyles(currentRoomContent)
        ),
        description: roomDescription,
        equipment,
        price,
        contains: "",
        isSpecial: isChecked,
        status: isStatus ? 1 : 0,
        slug: roomSlug,
        seoTitle,
        seoDescription,
        seoKeywords,
        seoImage,
        lineHeight: roomLineHeight,
        lineHeightMobile: roomLineHeightMobile,
        fontSize: roomFontSize,
        fontSizeMobile: roomFontSizeMobile,
        nameFontSize: roomNameFontSize,
        nameFontSizeMobile: roomNameFontSizeMobile,
        translateY: roomTranslateY,
        translateYMobile: roomTranslateYMobile,
      };
      const saved = await onSave(data);
      if (saved !== false) {
        serverTextSnapshotRef.current = {
          price: currentRoomPrice,
          equipment: currentRoomEquipment,
        };
        productTextDraftRef.current = null;
        clearProductTextDraft(textDraftKey);
        try {
          await galleryDraftWriteRef.current.catch(() => undefined);
          await clearProductGalleryDraft(galleryDraftKey);
          setGalleryDraftStatus("idle");
        } catch (error) {
          console.error("Unable to clear product gallery draft", error);
        }
      }
    }
  };

  return (
    <form
      id="product-form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="space-y-6"
    >
      <div className="w-full bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-8">
        {/* Thông tin cơ bản */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <span className="text-xl text-[#15803d]">📋</span>
            <Typography variant="h6" className="font-bold text-[#15803d]">
              Thông tin cơ bản
            </Typography>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tên phòng */}
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="room-name-rich" className="block text-base md:text-lg font-bold text-navy-700">
                Tên phòng (Nghệ thuật - H1, H2, Kiểu chữ...) <span className="text-red-500">*</span>
              </label>
              <div id="room-name-rich" className="product-dialog-quill product-dialog-quill--name border border-gray-200 rounded-xl overflow-visible bg-white">
                <LazyQuillWrapper
                  key={`quill-name-${id || 'new'}`}
                  theme="snow"
                  value={roomNameRich}
                  onChange={(val) => {
                    roomNameRichDraftRef.current = val;
                    setRoomNameRich(val);
                    let plainText = "";
                    if (typeof window !== "undefined") {
                      const tempDiv = document.createElement("div");
                      tempDiv.innerHTML = val;
                      plainText = (tempDiv.textContent || tempDiv.innerText || "").trim();
                    } else {
                      plainText = val.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
                    }
                    setRoomName(plainText);
                    const generatedSlug = plainText
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/\u0111/g, "d")
                      .replace(/[^a-z0-9\s-]/g, "")
                      .trim()
                      .replace(/[\s-]+/g, "-");
                    setRoomSlug(generatedSlug);
                    setErrors((prev) => ({ ...prev, roomName: "" }));
                  }}
                  onDraftChange={(val) => {
                    roomNameRichDraftRef.current = val;
                  }}
                  onBlur={(val) => {
                    roomNameRichDraftRef.current = val;
                    setRoomNameRich(val);
                    const plainText = getPlainText(val);
                    setRoomName(plainText);
                    const generatedSlug = plainText
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/\u0111/g, "d")
                      .replace(/[^a-z0-9\s-]/g, "")
                      .trim()
                      .replace(/[\s-]+/g, "-");
                    setRoomSlug(generatedSlug);
                    setErrors((prev) => ({ ...prev, roomName: "" }));
                  }}
                  placeholder="Nhập tên phòng..."
                  isBlogEditor={true}
                  className="room-name-editor"
                  lineHeight={roomNameLineHeight}
                  lineHeightMobile={roomNameLineHeightMobile}
                  fontSize={roomNameFontSize}
                  fontSizeMobile={roomNameFontSizeMobile}
                  translateY={roomNameTranslateY}
                  translateYMobile={roomNameTranslateYMobile}
                  onChangeLineHeight={setRoomNameLineHeight}
                  onChangeLineHeightMobile={setRoomNameLineHeightMobile}
                  onChangeFontSize={setRoomNameFontSize}
                  onChangeFontSizeMobile={setRoomNameFontSizeMobile}
                  onChangeTranslateY={setRoomNameTranslateY}
                  onChangeTranslateYMobile={setRoomNameTranslateYMobile}
                  hasResponsiveFontSize={true}
                  commitOnBlurOnly={true}
                />
              </div>
              {errors.roomName && (
                <Typography variant="small" color="red" className="mt-1 flex items-center gap-1 font-medium text-xs">
                  <FaExclamationTriangle className="inline-block mr-1 text-orange-500" /> {errors.roomName}
                </Typography>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <label htmlFor="room-slug" className="block text-base font-bold text-navy-700">
                Slug <span className="text-red-500">*</span>
              </label>
              <input
                id="room-slug"
                type="text"
                className={`w-full px-4 py-2.5 text-sm text-gray-700 bg-white border rounded-xl focus:outline-none transition-colors ${errors.roomSlug ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-[#15803d]"
                  }`}
                value={roomSlug}
                onChange={handleRoomSlugChange}
                placeholder="vi-du-ten-phong"
              />
              {errors.roomSlug && (
                <Typography variant="small" color="red" className="mt-1 flex items-center gap-1 font-medium text-xs">
                  <FaExclamationTriangle className="inline-block mr-1 text-orange-500" /> {errors.roomSlug}
                </Typography>
              )}
            </div>

            {/* Cấu hình hiển thị */}
            <div className="space-y-2">
              <label className="block text-base font-bold text-navy-700">
                Trạng thái phòng
              </label>
              <div className="flex gap-4">
                <label
                  htmlFor="checkbox-special"
                  className={`flex flex-1 cursor-pointer items-center gap-4 rounded-xl border p-6 transition-colors ${isChecked ? "border-[#15803d] bg-green-50/60" : "border-gray-200 hover:bg-gray-50/50"}`}
                >
                  <input
                    id="checkbox-special"
                    type="checkbox"
                    checked={isChecked}
                    onChange={handleCheckboxChange}
                    className="h-7 w-7 cursor-pointer rounded-md border-2 border-gray-300 accent-[#15803d]"
                  />
                  <span className="flex-1">
                    <Typography variant="h6" className="font-bold text-navy-700 text-sm">
                      Hết phòng
                    </Typography>
                  </span>
                </label>

                <label
                  htmlFor="checkbox-status"
                  className={`flex flex-1 cursor-pointer items-center gap-4 rounded-xl border p-6 transition-colors ${isStatus ? "border-[#15803d] bg-green-50/60" : "border-gray-200 hover:bg-gray-50/50"}`}
                >
                  <input
                    id="checkbox-status"
                    type="checkbox"
                    checked={isStatus}
                    onChange={handleStatusChange}
                    className="h-7 w-7 cursor-pointer rounded-md border-2 border-gray-300 accent-[#15803d]"
                  />
                  <span className="flex-1">
                    <Typography variant="h6" className="font-bold text-navy-700 text-sm">
                      Còn phòng trống
                    </Typography>
                  </span>
                </label>
              </div>
            </div>

            {/* Giá thuê */}
            <div className="space-y-2">
              <label htmlFor="room-price" className="block text-base font-bold text-navy-700">
                💵 Giá thuê (VNĐ)
              </label>
              <div id="room-price" className="product-dialog-quill product-dialog-quill--price border border-gray-200 rounded-xl overflow-visible bg-white">
                {isTextContentInitialized ? <QuillWrapper
                  key={`quill-price-${id || 'new'}`}
                  theme="snow"
                  value={roomPrice}
                  onChange={(val) => {
                    roomPriceDraftRef.current = val;
                    setRoomPrice(val);
                  }}
                  onDraftChange={(val) => {
                    roomPriceDraftRef.current = val;
                    persistTextDraft("price", val);
                  }}
                  onBlur={(val) => {
                    roomPriceDraftRef.current = val;
                    setRoomPrice(val);
                  }}
                  placeholder="Ví dụ: 80.000 đ/h..."
                  isBlogEditor={true}
                  disableImageWrap={true}
                  lineHeight={roomPriceLineHeight}
                  lineHeightMobile={roomPriceLineHeightMobile}
                  fontSize={roomPriceFontSize}
                  fontSizeMobile={roomPriceFontSizeMobile}
                  translateY={roomPriceTranslateY}
                  translateYMobile={roomPriceTranslateYMobile}
                  onChangeLineHeight={setRoomPriceLineHeight}
                  onChangeLineHeightMobile={setRoomPriceLineHeightMobile}
                  onChangeFontSize={setRoomPriceFontSize}
                  onChangeFontSizeMobile={setRoomPriceFontSizeMobile}
                  onChangeTranslateY={setRoomPriceTranslateY}
                  onChangeTranslateYMobile={setRoomPriceTranslateYMobile}
                  className="room-summary-editor"
                  hasResponsiveFontSize={true}
                  inlineSelectionControls={true}
                  commitOnBlurOnly={true}
                /> : <div className="h-[120px] animate-pulse bg-gray-50" />}
              </div>
            </div>

            {/* Thiết bị tóm tắt */}
            <div className="space-y-2">
              <label htmlFor="room-equipment" className="block text-base font-bold text-navy-700">
                📝 Thiết bị & Tiện ích tóm tắt
              </label>
              <div id="room-equipment" className="product-dialog-quill product-dialog-quill--equipment border border-gray-200 rounded-xl overflow-visible bg-white">
                {isTextContentInitialized ? <QuillWrapper
                  key={`quill-equipment-${id || 'new'}`}
                  theme="snow"
                  value={roomEquipment}
                  onChange={(val) => {
                    roomEquipmentDraftRef.current = val;
                    setRoomEquipment(val);
                  }}
                  onDraftChange={(val) => {
                    roomEquipmentDraftRef.current = val;
                    persistTextDraft("equipment", val);
                  }}
                  onBlur={(val) => {
                    roomEquipmentDraftRef.current = val;
                    setRoomEquipment(val);
                  }}
                  placeholder="Ví dụ: Sức chứa 45 chỗ..."
                  isBlogEditor={true}
                  disableImageWrap={true}
                  lineHeight={roomEquipmentLineHeight}
                  lineHeightMobile={roomEquipmentLineHeightMobile}
                  fontSize={roomEquipmentFontSize}
                  fontSizeMobile={roomEquipmentFontSizeMobile}
                  translateY={roomEquipmentTranslateY}
                  translateYMobile={roomEquipmentTranslateYMobile}
                  onChangeLineHeight={setRoomEquipmentLineHeight}
                  onChangeLineHeightMobile={setRoomEquipmentLineHeightMobile}
                  onChangeFontSize={setRoomEquipmentFontSize}
                  onChangeFontSizeMobile={setRoomEquipmentFontSizeMobile}
                  onChangeTranslateY={setRoomEquipmentTranslateY}
                  onChangeTranslateYMobile={setRoomEquipmentTranslateYMobile}
                  className="room-summary-editor"
                  hasResponsiveFontSize={true}
                  inlineSelectionControls={true}
                  commitOnBlurOnly={true}
                /> : <div className="h-[120px] animate-pulse bg-gray-50" />}
              </div>
            </div>

          </div>
        </div>

        {/* Hình ảnh & SEO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-200 pt-6">
          {/* Cột 1: Hình ảnh */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <span className="text-xl text-[#15803d]">🖼️</span>
              <Typography variant="h6" className="font-bold text-[#15803d]">
                Hình ảnh sản phẩm
              </Typography>
            </div>

            <div className="space-y-2">
              <label htmlFor="single-image" className="block text-xs font-bold text-navy-700">
                Ảnh đại diện <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs font-medium text-gray-500">
                Khuyến nghị: 800 x 875px, tỷ lệ 32:35. Dùng ảnh dọc nhẹ, rõ chủ thể phòng.
              </p>
              <input
                id="single-image"
                type="file"
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-green-50 file:text-[#15803d] hover:file:bg-green-100 transition-all cursor-pointer"
                onChange={handleSingleImageChange}
                accept="image/*"
              />
              {singleImage && (
                <div className="relative inline-block w-48 h-48 border-2 border-gray-200 rounded-none overflow-hidden shadow-md mt-2">
                  <img
                    src={typeof singleImage === "string" ? singleImage : URL.createObjectURL(singleImage)}
                    alt="Xem trước ảnh đại diện"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md transition-all active:scale-95"
                    onClick={removeSingleImage}
                  >
                    <MdClose className="h-5 w-5" />
                  </button>
                </div>
              )}
              {errors.image && (
                <Typography variant="small" color="red" className="mt-1 flex items-center gap-1 font-medium text-xs">
                  <FaExclamationTriangle className="inline-block mr-1 text-orange-500" /> {errors.image}
                </Typography>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label htmlFor="multiple-images" className="block text-xs font-bold text-navy-700">
                Bộ sưu tập ảnh chi tiết
              </label>
              <p className="mb-2 text-xs font-medium text-gray-500">
                Khuyến nghị: 1000 x 750px, tỷ lệ 4:3. Dùng ảnh phòng rõ không gian; gallery sẽ tự ép ảnh khác tỷ lệ vào khung này.
              </p>
              <input
                id="multiple-images"
                type="file"
                multiple
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-green-50 file:text-[#15803d] hover:file:bg-green-100 transition-all cursor-pointer"
                onChange={handleMultipleImagesChange}
                accept="image/*"
              />
              {galleryDraftStatus === "saving" && (
                <p className="text-xs font-medium text-gray-500">Đang lưu ảnh nháp...</p>
              )}
              {galleryDraftStatus === "saved" && multipleImages.some((image) => image instanceof File) && (
                <p className="text-xs font-bold text-[#15803d]">
                  Đã lưu nháp {multipleImages.filter((image) => image instanceof File).length} ảnh trên thiết bị này.
                </p>
              )}
              {galleryDraftStatus === "error" && (
                <p className="text-xs font-bold text-red-500">Không thể lưu ảnh nháp trên trình duyệt này.</p>
              )}
              {multipleImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {multipleImages.map((image, index) => (
                    <div key={index} className="relative w-full aspect-[4/3] border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      <img
                        src={typeof image === "string" ? image : URL.createObjectURL(image)}
                        alt={`Xem trước ảnh chi tiết ${index}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md transition-all active:scale-95"
                        onClick={() => removeMultipleImage(index)}
                      >
                        <MdClose className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cột 2: SEO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
              <span className="text-xl text-[#15803d]">🔍</span>
              <Typography variant="h6" className="font-bold text-[#15803d]">
                Cấu hình SEO
              </Typography>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="seo-title" className="block text-xs font-bold text-navy-700">
                  Tiêu đề SEO
                </label>
                <input
                  id="seo-title"
                  type="text"
                  className="w-full px-3 py-2 text-xs text-gray-700 bg-white border border-gray-300 rounded-xl focus:border-[#15803d] focus:outline-none transition-colors"
                  value={seoTitle}
                  onChange={handleSeoTitleChange}
                  placeholder="Tiêu đề SEO cho phòng học..."
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="seo-description" className="block text-xs font-bold text-navy-700">
                  Mô tả SEO
                </label>
                <textarea
                  id="seo-description"
                  className="w-full px-3 py-2 text-xs text-gray-700 bg-white border border-gray-300 rounded-xl focus:border-[#15803d] focus:outline-none transition-colors"
                  value={seoDescription}
                  onChange={handleSeoDescriptionChange}
                  placeholder="Mô tả SEO ngắn gọn..."
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="seo-keywords" className="block text-xs font-bold text-navy-700">
                  Từ khóa SEO
                </label>
                <input
                  id="seo-keywords"
                  type="text"
                  className="w-full px-3 py-2 text-xs text-gray-700 bg-white border border-gray-300 rounded-xl focus:border-[#15803d] focus:outline-none transition-colors"
                  value={seoKeywords}
                  onChange={handleSeoKeywordsChange}
                  placeholder="Từ khóa cách nhau bằng dấu phẩy..."
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="seo-image" className="block text-xs font-bold text-navy-700">
                  Hình ảnh SEO
                </label>
                <input
                  id="seo-image"
                  type="file"
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-green-50 file:text-[#15803d] hover:file:bg-green-100 transition-all cursor-pointer"
                  onChange={handleSeoImageChange}
                  accept="image/*"
                />
                {seoImage && (
                  <div className="relative inline-block w-20 h-20 border border-gray-200 rounded-xl overflow-hidden shadow-sm mt-2">
                    <img
                      src={typeof seoImage === "string" ? seoImage : URL.createObjectURL(seoImage)}
                      alt="Xem trước ảnh SEO"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-md transition-all active:scale-95"
                      onClick={removeSeoImage}
                    >
                      <MdClose className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mô tả chi tiết phòng học */}
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <span className="text-xl text-[#15803d]">📝</span>
            <Typography variant="h6" className="font-bold text-[#15803d]">
              Mô tả chi tiết phòng học
            </Typography>
          </div>

          {/* Canvas rộng tối đa đạt đúng cấu trúc tỉ lệ hiển thị trên trang public */}
          <div className="w-full bg-white rounded-xl ckeditor-content content-img py-2">
            <div className="product-dialog-quill product-dialog-quill--content border border-gray-200 rounded-xl overflow-visible bg-white shadow-sm ring-1 ring-black/5">
              <LazyQuillWrapper
                key={`quill-content-${id || 'new'}`}
                theme="snow"
                value={roomContent}
                onChange={(val) => {
                  roomContentDraftRef.current = val;
                }}
                onDraftChange={(val) => {
                  roomContentDraftRef.current = val;
                }}
                onBlur={(val) => {
                  roomContentDraftRef.current = val;
                  setRoomContent(val);
                }}
                placeholder="Nhập mô tả chi tiết phòng học..."
                isBlogEditor={true}
                className="room-desc-editor"
                minHeight="160px"
                maxHeight="520px"
                lineHeight={roomLineHeight}
                lineHeightMobile={roomLineHeightMobile}
                fontSize={roomFontSize}
                fontSizeMobile={roomFontSizeMobile}
                translateY={roomTranslateY}
                translateYMobile={roomTranslateYMobile}
                onChangeLineHeight={setRoomLineHeight}
                onChangeLineHeightMobile={setRoomLineHeightMobile}
                onChangeFontSize={setRoomFontSize}
                onChangeFontSizeMobile={setRoomFontSizeMobile}
                onChangeTranslateY={setRoomTranslateY}
                onChangeTranslateYMobile={setRoomTranslateYMobile}
                hasResponsiveFontSize={true}
                inlineSelectionControls={true}
                commitOnBlurOnly={true}
              />
            </div>
          </div>
        </div>

        {/* Cấu hình nút lưu ở dưới cùng */}
        <div className="hidden">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-8 py-3 text-sm font-bold text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-95"
          >
            <MdClose className="h-5 w-5" />
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="hidden"
          >
            <MdSave className="h-5 w-5" />
            Lưu thông tin phòng
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .product-dialog-quill {
          position: relative;
          overflow: visible;
        }
        .product-dialog-quill .quill-wrapper-container {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: visible !important;
          position: relative !important;
          z-index: 20;
        }
        .product-dialog-quill .quill-wrapper-container:focus-within,
        .product-dialog-quill .quill-wrapper-container:has(.ql-expanded) {
          border-color: #15803d;
          box-shadow: 0 0 0 1px rgba(21, 128, 61, 0.3);
          z-index: 30 !important;
        }
        .product-dialog-quill .ql-toolbar.ql-snow {
          position: relative !important;
          overflow: visible !important;
        }
        .product-dialog-quill .quill-wrapper-container.is-sticky .ql-toolbar.ql-snow {
          position: sticky !important;
          top: var(--quill-toolbar-top, 0px) !important;
          z-index: 35 !important;
          overflow: visible !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03) !important;
        }
        .product-dialog-quill .ql-snow .ql-picker-options {
          z-index: 36 !important;
        }
        .product-dialog-quill--name .ql-editor {
          min-height: 100px;
        }
        .product-dialog-quill--price .room-summary-editor.quill-wrapper-container.is-blog-editor .ql-editor,
        .product-dialog-quill--equipment .room-summary-editor.quill-wrapper-container.is-blog-editor .ql-editor {
          min-height: 80px;
          padding: 12px 16px !important;
        }
      ` }} />
      <div className="fixed bottom-8 right-8 z-[9998] flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-600 shadow-xl shadow-slate-900/10 ring-1 ring-gray-200 transition-all hover:bg-red-50 hover:text-red-500 hover:shadow-2xl active:scale-95"
          aria-label="Hủy bỏ"
        >
          <MdClose className="h-5 w-5" />
          <span className="hidden sm:inline">Hủy bỏ</span>
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 rounded-xl bg-[#15803d] px-5 py-3 text-sm font-bold text-white shadow-xl shadow-green-900/15 transition-all hover:bg-[#166534] hover:shadow-2xl active:scale-95"
          aria-label="Lưu thông tin phòng"
        >
          <MdSave className="h-5 w-5" />
          <span className="hidden sm:inline">Lưu phòng</span>
        </button>
      </div>
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-24 right-8 z-[9999] p-3 rounded-full bg-[#15803d] hover:bg-[#166534] text-white shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95 flex items-center justify-center"
          aria-label="Cuộn lên đầu trang"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
          </svg>
        </button>
      )}
    </form>
  );
}

ProductForm.propTypes = {
  dataEdit: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  isPage: PropTypes.bool,
};
