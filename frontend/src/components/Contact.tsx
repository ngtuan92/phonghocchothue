"use client";

import Image from "next/image";
import { useState, FormEvent } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useConfigContentByKey from "../hooks/useConfigContentByKey";
import { useCreateContact } from "@/hooks/api/useContact";

const URL_API = process.env.NEXT_PUBLIC_URL_API || "http://localhost:3000/";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const createContact = useCreateContact();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const templateParams = {
      name: name,
      email: email,
      phone: phone,
      subject: message,
    };

    // Kiểm tra xem các giá trị có hợp lệ không trước khi gửi
    if (!name || !email || !message || !phone) {
      toast.error("Làm ơn điền đầy đủ thông tin.");
      return;
    }

    try {
      await createContact.mutateAsync(templateParams);
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      toast.success("Gửi thông báo thành công!");
    } catch {
      toast.error("Gửi thông báo thất bại!");
    }
  };

  const imgContact = useConfigContentByKey("imgContact");
  const imgUrl = imgContact
    ? `${URL_API}${imgContact.replace(/\\/g, "/")}`
    : "";

  return (
    <div className="mt-6 sm:mt-12 mb-6 sm:mb-12 w-full p-6 px-[40px] sm:p-20 grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 justify-center justify-items-center">
      {imgUrl && (
        <Image
          className="p-0 sm:p-6 w-full flex justify-center items-center"
          src={imgUrl}
          alt="Contact"
          width={800}
          height={600}
          sizes="(max-width: 768px) 100vw, 50vw"
          quality={85}
          loading="lazy"
        />
      )}

      <div className="w-full p-4 px-0 sm:px-4 flex items-center">
        <form onSubmit={handleSubmit} className="w-full">
          <label className="block mb-2 ">
            <input
              type="text"
              placeholder="Họ và tên"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="text-xs sm:text-lg mt-1 block w-full border border-[#b8c7b0] placeholder:text-[#abb8c3] rounded-[5px] p-2 text-black px-4"
            />
          </label>
          <label className="block mb-2">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-xs sm:text-lg mt-1 block w-full border border-[#b8c7b0] placeholder:text-[#abb8c3] rounded-[5px] p-2 text-black px-4"
            />
          </label>
          <label className="block mb-2">
            <input
              type="tel"
              placeholder="Số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="text-xs sm:text-lg mt-1 block w-full border border-[#B8C7B0] placeholder:text-[#abb8c3] rounded-[5px] p-2 text-black px-4"
            />
          </label>
          <label className="block mb-2">
            <textarea
              placeholder="Nội dung"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="mt-1 h-[100px] text-xs sm:text-lg block w-full border border-[#b8c7b0] rounded-[5px] p-2 placeholder:text-[#abb8c3] text-black px-4"
            ></textarea>
          </label>
          <button
            type="submit"
            disabled={createContact.isPending}
            className="mt-4 w-auto bg-[#b8c7b0] px-[15px] sm:px-[20px] text-white rounded-tl-xl text-xs sm:text-lg rounded-br-xl py-2 hover:bg-[#e57f7f] max-sm:mt-0"
          >
            {createContact.isPending ? "ĐANG GỬI..." : "GỬI THÔNG BÁO"}
          </button>
        </form>
      </div>

      <ToastContainer />
    </div>
  );
};

export default Contact;

