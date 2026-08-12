import {
  clearProductGalleryDraft,
  loadProductGalleryDraft,
  saveProductGalleryDraft,
} from "./productGalleryDraft";

export const getBlogThumbnailDraftKey = (blogId?: string | number | null) =>
  `blog-thumbnail:${blogId || "new"}`;

export const saveBlogThumbnailDraft = (key: string, file: File) =>
  saveProductGalleryDraft(key, [file]);

export const loadBlogThumbnailDraft = async (key: string) => {
  const files = await loadProductGalleryDraft(key);
  return files[0] || null;
};

export const clearBlogThumbnailDraft = (key: string) =>
  clearProductGalleryDraft(key);
