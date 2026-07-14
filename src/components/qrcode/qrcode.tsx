import QRCode from "react-qr-code";

export default function QRCodeGenerator({ url }: { url: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "40px" }}>
            <h2>Scan Now</h2>   

            {/* QR Code Container */}
            <div style={{ background: "white", padding: "16px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                {url ? (
                    <QRCode
                        value={url}
                        size={256}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 256 256`}
                    />
                ) : (
                    <p style={{ color: "#666" }}>Please enter a valid URL</p>
                )}
            </div>
        </div>
    );
}