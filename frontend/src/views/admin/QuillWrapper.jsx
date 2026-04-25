import React, { forwardRef, useEffect } from "react";
import ReactQuill, { Quill } from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const FONTS = [
  "roboto", "playfair-display", "montserrat", "poppins", 
  "raleway", "dancing-script", "pacifico", "amatic-sc", "bebas-neue", 
  "syncopate", "great-vibes", "pinyon-script", "alex-brush", "parisienne",
  "tangerine", "satisfy", "caveat", "oswald", "lato", "nunito", "quicksand",
  "arial", "times-new-roman", "serif", "monospace", "inter", "iciel-amber"
];

if (Quill) {
  const Font = Quill.import("formats/font");
  const FontClass = Quill.import("attributors/class/font");
  
  Font.whitelist = [false, ...FONTS];
  FontClass.whitelist = [false, ...FONTS];
  
  Quill.register(Font, true);
  Quill.register(FontClass, true);
}

const QuillWrapper = forwardRef((props, ref) => {
  const editorRef = React.useRef(null);
  
  React.useImperativeHandle(ref, () => editorRef.current);

  // Ép nạp lại nội dung để đảm bảo font được nhận diện đúng khi vừa mount
  useEffect(() => {
    if (editorRef.current && props.value) {
      const quill = editorRef.current.getEditor();
      if (quill) {
        const html = quill.root.innerHTML;
        // Nếu trong DB có font class mà editor hiện tại không có, ép nạp lại
        if (props.value.includes('ql-font-') && !html.includes('ql-font-')) {
          quill.clipboard.dangerouslyPasteHTML(props.value);
        }
      }
    }
  }, []);

  return <ReactQuill ref={editorRef} {...props} />;
});

QuillWrapper.displayName = "QuillWrapper";

export default QuillWrapper;
