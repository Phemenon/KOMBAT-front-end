import { useState } from "react";
import { useNavigate } from "react-router-dom";
import GlowButton from "../../components/GlowButton.tsx";
import BGLayout from "../../components/Background.tsx";
import NameModal from "../../components/NameModal.tsx";
import { userApi } from "../../api/userApi.ts";

import "../../globalStyle.css";
import "../HomePage/HomePageStyle.css";

import hameBG from "../../assets/bg-home-page.png";

export default function HomePage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const navigate = useNavigate();

    return (
        <BGLayout image={hameBG}>
            <div className="homeContent">
                <h1 className="homeTitle">KOMBAT</h1>

                <div className="homeMenu">
                    <GlowButton
                        text="Start"
                        onClick={() => setIsModalOpen(true)}
                    />
                </div>
            </div>

            <NameModal
                isOpen={isModalOpen}
                onConfirm={async (name) => {
                    if (!name.trim()) {
                        alert("Please enter your name");
                        return;
                    }

                    if (isCreating) return;

                    try {
                        setIsCreating(true);
                        setIsModalOpen(false);

                        const userId = await userApi.registerUser(name);

                        sessionStorage.setItem("userId", userId);
                        sessionStorage.setItem("userName", name);

                        navigate("/host-play");
                    } catch (err) {
                        console.error(err);
                        alert("Cannot create user");
                    } finally {
                        setIsCreating(false);
                    }
                }}
                onCancel={() => setIsModalOpen(false)}
            />
        </BGLayout>
    );
}