import React from "react";

interface BackgroundLayoutProps {
    image: string;
    children: React.ReactNode;
}

export default function BGLayout({ image, children }: BackgroundLayoutProps) {
    return (
        <div
            className="backgroundLayout"
            style={{
                backgroundImage: `url(${image})`,
            }}
        >
            {children}
        </div>
    );
}
