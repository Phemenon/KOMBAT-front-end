import React from "react";

// กำหนด type ของ props ที่ปุ่มรับได้
type GlowButtonProps = {
    text: string;                 // ข้อความบนปุ่ม
    onClick?: () => void;         // function เมื่อคลิก
};

const GlowButton: React.FC<GlowButtonProps> = ({ text, onClick }) => {
    return (
        <button
            className="btn"            // ใช้ class เดิมของคุณ
            onClick={onClick}          // ผูก event click
        >
            {text}                     {/* แสดงข้อความ */}
        </button>
    );
};

export default GlowButton;       // export เพื่อให้หน้าอื่น import ไปใช้ได้
