import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient";
import { useNavigate } from "react-router-dom";
import petalos from "../pages/image/petalo.png";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Check if user is already logged in
    useEffect(() => {
        async function checkSession() {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                navigate("/admin");
            }
        }
        checkSession();
    }, [navigate]);

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            setErrorMsg("Credenciales incorrectas o usuario no registrado.");
            setLoading(false);
        } else {
            navigate("/admin");
        }
    }

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontFamily: "Inter, sans-serif",
            backgroundImage: `url(${petalos})`, // Same elegant background
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed"
        }}>
            <style>{`
                .login-input {
                    width: 100%;
                    padding: 14px 16px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    font-size: 15px;
                    color: white;
                    outline: none;
                    transition: all 0.3s ease;
                    box-sizing: border-box;
                    font-family: inherit;
                    background-color: rgba(0, 0, 0, 0.4);
                }
                .login-input::placeholder {
                    color: rgba(255, 255, 255, 0.5);
                }
                .login-input:focus {
                    border-color: rgba(255, 255, 255, 0.6);
                    background-color: rgba(0, 0, 0, 0.6);
                    box-shadow: 0 0 15px rgba(255, 255, 255, 0.1);
                }
                .btn-login {
                    width: 100%;
                    padding: 14px;
                    border: none;
                    border-radius: 12px;
                    color: #fff;
                    font-weight: 600;
                    font-size: 16px;
                    cursor: pointer;
                    background: linear-gradient(135deg, #2a2a2a, #111);
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                }
                .btn-login:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
                    background: linear-gradient(135deg, #333, #1a1a1a);
                }
                .btn-login:disabled {
                    background: #555;
                    cursor: not-allowed;
                    opacity: 0.7;
                }
            `}</style>

            {/* Glassmorphism Panel */}
            <div style={{
                width: "100%",
                maxWidth: 400,
                padding: "40px 30px",
                borderRadius: 24,
                backgroundColor: "rgba(20, 20, 20, 0.75)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                textAlign: "center"
            }}>
                <div style={{ marginBottom: 30 }}>
                    <h2 style={{
                        margin: 0,
                        color: "white",
                        fontSize: 28,
                        fontWeight: 700,
                        letterSpacing: "-0.02em"
                    }}>
                        Bienvenido
                    </h2>
                    <p style={{
                        margin: "8px 0 0 0",
                        color: "rgba(255, 255, 255, 0.6)",
                        fontSize: 14
                    }}>
                        Ingresa tus credenciales de administrador
                    </p>
                </div>

                {errorMsg && (
                    <div style={{
                        padding: "12px",
                        marginBottom: 20,
                        borderRadius: 10,
                        color: "#ffcdd2",
                        backgroundColor: "rgba(211, 47, 47, 0.3)",
                        border: "1px solid rgba(211, 47, 47, 0.5)",
                        fontSize: 14,
                        backdropFilter: "blur(4px)"
                    }}>
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                        <input
                            type="email"
                            placeholder="Correo electrónico"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="login-input"
                            required
                        />
                    </div>

                    <div>
                        <input
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="login-input"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-login"
                        disabled={loading}
                        style={{ marginTop: 10 }}
                    >
                        {loading ? "Autenticando..." : "Ingresar al Panel"}
                    </button>

                    <p style={{
                        marginTop: 24,
                        fontSize: 13,
                        color: "rgba(255, 255, 255, 0.4)"
                    }}>
                        Solo para personal autorizado
                    </p>
                </form>
            </div>
        </div>
    );
}