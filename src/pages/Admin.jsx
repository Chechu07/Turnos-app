import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"
import { supabase } from "../api/supabaseClient";
import petalos from "../pages/image/petalo.png"

const SERVICE_PRICES = {
    "Manicuría Semipermanente": 4500,
    "Esculpidas en Gel": 6500,
    "Lifting de Pestañas": 5000,
    "Perfilado de Cejas": 3500,
    "Limpieza Facial Profunda": 8000
};

const getServicePrice = (serviceName) => {
    if (!serviceName) return 0;
    if (SERVICE_PRICES[serviceName]) return SERVICE_PRICES[serviceName];
    const foundKey = Object.keys(SERVICE_PRICES).find(key => key.toLowerCase() === serviceName.toLowerCase().trim());
    return foundKey ? SERVICE_PRICES[foundKey] : 0;
};

export default function Admin() {
    const navigate = useNavigate()
    const [appointments, setAppointments] = useState([])
    const [professionals, setProfessionals] = useState([])
    const [loading, setLoading] = useState(true)
    const [showPast, setShowPast] = useState(false)
    const [historySearch, setHistorySearch] = useState("")

    // Kanban Filter State
    const [selectedProfFilter, setSelectedProfFilter] = useState("all")

    // Team management state
    const [showTeam, setShowTeam] = useState(false)
    const [newProfessionalName, setNewProfessionalName] = useState("")
    const [savingProfessional, setSavingProfessional] = useState(false)

    // Modal state
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        client_name: "",
        phone: "",
        service_name: "",
        professional_id: "",
        date: "",
        time: ""
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        let mounted = true;

        async function checkSession() {
            // Wait briefly to ensure Supabase auth state is fully initialized from local storage
            await new Promise(resolve => setTimeout(resolve, 50));

            const { data } = await supabase.auth.getSession();

            if (mounted) {
                if (!data.session) {
                    navigate("/login");
                } else {
                    setLoading(false);
                }
            }
        }

        checkSession();

        // Listen for auth state changes (e.g., if session expires or user logs out elsewhere)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                if (!session) {
                    navigate("/login");
                } else {
                    setLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [navigate]);

    async function loadData() {
        console.log("Ejecutando loadData: Consultando Supabase...");
        // Load appointments
        const { data: apptData, error: apptError } = await supabase
            .from("appointments")
            .select(`
            id,
            client_name,
            phone,
            appointment_time,
            professional_id,
            service_name,
            professionals(name)
            `)
            .order("appointment_time", { ascending: true });

        if (apptError) {
            console.error("Error al cargar turnos desde Supabase:", apptError);
        } else {
            console.log("Datos reales obtenidos de Supabase:", apptData);
            setAppointments(apptData || []);
        }

        // Load professionals
        const { data: profData } = await supabase
            .from("professionals")
            .select("*")

        setProfessionals(profData || [])
    }

    useEffect(() => {
        if (loading) return
        loadData()
    }, [loading])

    if (loading) return <p>Cargando...</p>

    async function handleLogout() {
        await supabase.auth.signOut()
        navigate("/login")
    }

    async function handleDelete(id) {
        if (!window.confirm("¿Estás seguro de que deseas eliminar este turno?")) return;

        try {
            console.log("Iniciando borrado en Supabase para ID:", id);
            const { error } = await supabase
                .from('appointments')
                .delete()
                .eq('id', id);

            if (error) throw error;

            console.log("Borrado exitoso en Supabase");

            // Actualizamos la pantalla inmediatamente
            setAppointments(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            console.error("Error real capturado:", error);
            alert("Hubo un error al borrar: " + error.message);
        }
    }

    async function handleSaveAppointment(e) {
        e.preventDefault()
        setSaving(true)

        try {
            // Combine date and time
            const appointmentTime = new Date(`${formData.date}T${formData.time}`).toISOString()

            const { data, error } = await supabase
                .from("appointments")
                .insert([
                    {
                        client_name: formData.client_name,
                        phone: formData.phone,
                        service_name: formData.service_name || null,
                        professional_id: formData.professional_id,
                        appointment_time: appointmentTime
                    }
                ])
                .select(`
                    id,
                    client_name,
                    phone,
                    appointment_time,
                    professional_id,
                    service_name,
                    professionals(name)
                `)

            if (error) throw error

            if (data && data.length > 0) {
                // Add the new appointment and sort by time
                const updatedAppointments = [...appointments, data[0]].sort((a, b) =>
                    new Date(a.appointment_time) - new Date(b.appointment_time)
                )
                setAppointments(updatedAppointments)

                // Reset form and close modal
                setFormData({
                    client_name: "",
                    phone: "",
                    service_name: "",
                    professional_id: "",
                    date: "",
                    time: ""
                })
                setShowModal(false)
            }
        } catch (error) {
            console.error("Error saving appointment:", error)
            alert("Hubo un error al guardar el turno.")
        } finally {
            setSaving(false)
        }
    }

    async function handleClearOldHistory() {
        if (!window.confirm("¿Estás seguro de que deseas eliminar TODOS los turnos con más de 1 año de antigüedad? Esta acción no se puede deshacer.")) {
            return;
        }

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        try {
            const { error } = await supabase
                .from("appointments")
                .delete()
                .lt("appointment_time", oneYearAgo.toISOString());

            if (error) throw error;

            // Reload appointments locally
            setAppointments(appointments.filter(a => new Date(a.appointment_time) >= oneYearAgo));
            alert("Turnos antiguos eliminados correctamente.");
        } catch (error) {
            console.error("Error al limpiar historial:", error);
            alert("Hubo un error al limpiar el historial.");
        }
    }

    async function handleAddProfessional(e) {
        e.preventDefault()
        if (!newProfessionalName.trim()) return

        setSavingProfessional(true)

        try {
            const { data, error } = await supabase
                .from("professionals")
                .insert([{ name: newProfessionalName }])
                .select()

            if (error) throw error

            if (data && data.length > 0) {
                setProfessionals([...professionals, data[0]])
                setNewProfessionalName("")
            }
        } catch (error) {
            console.error("Error adding professional:", error)
            alert("Hubo un error al agregar al profesional.")
        } finally {
            setSavingProfessional(false)
        }
    }

    async function handleDeleteProfessional(id) {
        if (!window.confirm("¿Seguro que deseas eliminar a este profesional? NOTA: Si tiene turnos asignados puede causar errores.")) {
            return;
        }

        const { error } = await supabase
            .from("professionals")
            .delete()
            .eq("id", id);

        if (!error) {
            setProfessionals(prev => prev.filter(item => item.id !== id));
        } else {
            console.error("Error al borrar:", error);
            alert("No se pudo eliminar el profesional de la base de datos.");
        }
    }


    const now = new Date()

    const futureAppointments = appointments.filter(
        (a) => new Date(a.appointment_time) >= now
    )

    const pastAppointments = appointments
        .filter((a) => new Date(a.appointment_time) < now)
        .sort((a, b) => new Date(b.appointment_time) - new Date(a.appointment_time)) // Newest first

    const filteredPastAppointments = pastAppointments.filter(a =>
        a.client_name.toLowerCase().includes(historySearch.toLowerCase())
    )

    // Kanban Filtering Logic
    const professionalsToShow = selectedProfFilter === "all"
        ? professionals
        : professionals.filter(p => p.id === selectedProfFilter)

    return (
        <div style={{
            minHeight: "100vh",
            width: "100vw",
            boxSizing: "border-box",
            margin: 0,
            padding: "40px 20px",
            fontFamily: "Inter, sans-serif",
            backgroundImage: `url(${petalos})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundAttachment: "fixed"
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
                
                * {
                    box-sizing: border-box;
                }
                body, #root {
                    margin: 0;
                    padding: 0;
                    overflow-x: hidden;
                }
                .admin-table-row {
                    transition: background-color 0.2s ease;
                }
                .admin-table-row:hover {
                    background-color: rgba(255, 255, 255, 0.6);
                }
                .btn-delete:hover {
                    background-color: #fee2e2 !important;
                }
                .btn-logout:hover {
                    background-color: #f9fafb !important;
                    color: #111 !important;
                }
                .btn-primary:hover {
                    background-color: #333 !important;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0,0,0,0.4);
                    backdrop-filter: blur(4px);
                    display: flex;
                    alignItems: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: fadeIn 0.2s ease;
                }
                .history-accordion {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.4s ease-in-out, opacity 0.4s ease-in-out;
                    opacity: 0;
                }
                .history-accordion.open {
                    max-height: 2000px; /* arbitrary large value */
                    opacity: 1;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .input-field {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 15px;
                    outline: none;
                    transition: all 0.2s;
                    box-sizing: border-box;
                    font-family: inherit;
                }
                .input-field:focus {
                    border-color: #111;
                    box-shadow: 0 0 0 2px rgba(0,0,0,0.05);
                }
                
                /* Kanban Styles */
                .kanban-container {
                    display: flex;
                    gap: 24px;
                    overflow-x: auto;
                    padding-bottom: 20px;
                    scroll-snap-type: x mandatory;
                }
                .kanban-column {
                    flex: 0 0 320px;
                    background: rgba(255, 255, 255, 0.4);
                    border-radius: 20px;
                    padding: 20px;
                    border: 1px solid rgba(255,255,255,0.6);
                    scroll-snap-align: start;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .kanban-card {
                    background: white;
                    border-radius: 16px;
                    padding: 20px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.04);
                    border: 1px solid #f0f0f0;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .kanban-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.08);
                }
                
                /* Filter Pills */
                .filter-pill {
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: rgba(255,255,255,0.6);
                    border: 1px solid transparent;
                    color: #555;
                }
                .filter-pill.active {
                    background: #111;
                    color: white;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
                .filter-pill:hover:not(.active) {
                    background: white;
                    border-color: #ddd;
                }
                
                /* Scrollbar for Kanban */
                .kanban-container::-webkit-scrollbar {
                    height: 8px;
                }
                .kanban-container::-webkit-scrollbar-track {
                    background: rgba(0,0,0,0.05);
                    border-radius: 4px;
                }
                .kanban-container::-webkit-scrollbar-thumb {
                    background: rgba(0,0,0,0.2);
                    border-radius: 4px;
                }
            `}</style>

            <div style={{
                maxWidth: 1100,
                margin: "0 auto",
                padding: 40,
                borderRadius: 24,
                backgroundColor: "rgba(255, 255, 255, 0.85)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.4)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.06)"
            }}>
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 40
                }}>
                    <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#111" }}>Panel Admin</h1>

                    <button
                        onClick={handleLogout}
                        className="btn-logout"
                        style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            fontWeight: 500,
                            fontSize: 14,
                            border: "1px solid #eaeaea",
                            backgroundColor: "white",
                            color: "#555",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                        }}
                    >
                        Cerrar sesión
                    </button>
                </div>

                <div style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: 24
                }}>
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-primary"
                        style={{
                            padding: "10px 20px",
                            borderRadius: 12,
                            fontWeight: 600,
                            fontSize: 15,
                            border: "none",
                            backgroundColor: "#111",
                            color: "white",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Nuevo Turno
                    </button>
                </div>

                {appointments.length === 0 ? (
                    <div style={{
                        padding: 40,
                        textAlign: "center",
                        color: "#666",
                        backgroundColor: "rgba(255,255,255,0.5)",
                        borderRadius: 16
                    }}>
                        <p>No hay turnos registrados.</p>
                    </div>
                ) : (
                    <>
                        {/* Kanban Filter */}
                        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", overflowX: "auto", paddingBottom: "8px" }}>
                            <button
                                className={`filter-pill ${selectedProfFilter === "all" ? "active" : ""}`}
                                onClick={() => setSelectedProfFilter("all")}
                            >
                                Todas
                            </button>
                            {professionals.map(prof => (
                                <button
                                    key={prof.id}
                                    className={`filter-pill ${selectedProfFilter === prof.id ? "active" : ""}`}
                                    onClick={() => setSelectedProfFilter(prof.id)}
                                >
                                    {prof.name}
                                </button>
                            ))}
                        </div>

                        {/* Kanban Board Container */}
                        <div className="kanban-container">
                            {professionalsToShow.map(prof => {
                                // Filter future appointments for THIS professional
                                const profAppointments = futureAppointments.filter(a => a.professional_id === prof.id);

                                const columnTotal = profAppointments.reduce((sum, appt) => sum + getServicePrice(appt.service_name), 0);
                                const formattedTotal = new Intl.NumberFormat('es-AR', {
                                    style: 'currency',
                                    currency: 'ARS',
                                    maximumFractionDigits: 0
                                }).format(columnTotal);

                                return (
                                    <div key={prof.id} className="kanban-column">

                                        <div style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            borderBottom: "1px solid rgba(0,0,0,0.1)",
                                            paddingBottom: "16px",
                                            marginBottom: "8px",
                                            gap: "12px"
                                        }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#111" }}>
                                                    {prof.name}
                                                </h3>
                                                <span style={{
                                                    background: "#111",
                                                    color: "white",
                                                    padding: "2px 10px",
                                                    borderRadius: "12px",
                                                    fontSize: "12px",
                                                    fontWeight: "600"
                                                }}>
                                                    {profAppointments.length}
                                                </span>
                                            </div>

                                            <div style={{
                                                alignSelf: "flex-start",
                                                background: "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)",
                                                border: "1px solid rgba(244, 143, 177, 0.5)",
                                                color: "#880e4f",
                                                padding: "6px 14px",
                                                borderRadius: "20px",
                                                fontFamily: "'Playfair Display', serif",
                                                fontSize: "14px",
                                                fontWeight: "600",
                                                boxShadow: "0 2px 8px rgba(244, 143, 177, 0.25)",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "6px"
                                            }}>
                                                Total Agendado: {formattedTotal.replace(/\s/, "\u00A0")}
                                            </div>
                                        </div>

                                        {profAppointments.length === 0 ? (
                                            <p style={{ textAlign: "center", margin: "20px 0", color: "#888", fontSize: "14px" }}>
                                                Sin turnos programados
                                            </p>
                                        ) : (
                                            profAppointments.map(appointment => {
                                                const date = new Date(appointment.appointment_time)
                                                // Check if it's today
                                                const isToday = date.toDateString() === new Date().toDateString();
                                                const dateText = isToday ? "Hoy" : date.toLocaleDateString([], { day: '2-digit', month: 'short' });
                                                const timeText = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

                                                const cleanPhone = appointment.phone ? appointment.phone.replace(/\D/g, "") : "";
                                                const waMessage = encodeURIComponent(`Hola ${appointment.client_name}, te recordamos tu turno el día ${date.toLocaleDateString()} a las ${timeText} en Secret Seduction.`);
                                                const waLink = `https://wa.me/${cleanPhone}?text=${waMessage}`;

                                                return (
                                                    <div key={appointment.id} className="kanban-card">
                                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                                                            <div style={{
                                                                background: isToday ? "#fee2e2" : "#f1f5f9",
                                                                color: isToday ? "#b91c1c" : "#475569",
                                                                padding: "4px 10px",
                                                                borderRadius: "8px",
                                                                fontSize: "20px",
                                                                fontWeight: "700",
                                                                letterSpacing: "-0.5px"
                                                            }}>
                                                                {timeText}
                                                            </div>
                                                            <div style={{ fontSize: "13px", color: "#666", fontWeight: "500", marginTop: "4px" }}>
                                                                {dateText}
                                                            </div>
                                                        </div>

                                                        <h4 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "#111", fontWeight: "600" }}>
                                                            {appointment.client_name}
                                                        </h4>

                                                        <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#d81b60", fontWeight: "500" }}>
                                                            {appointment.service_name || "Servicio no especificado"}
                                                        </p>

                                                        <div style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            borderTop: "1px solid #f0f0f0",
                                                            paddingTop: "12px"
                                                        }}>
                                                            <div style={{ fontSize: "13px", color: "#666", display: "flex", alignItems: "center", gap: "6px" }}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                                {appointment.phone || "-"}
                                                            </div>

                                                            <div style={{ display: "flex", gap: "4px" }}>
                                                                <a
                                                                    href={cleanPhone ? waLink : "#"}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{
                                                                        background: cleanPhone ? "#e8f5e9" : "#f9f9f9",
                                                                        color: cleanPhone ? "#25D366" : "#ccc",
                                                                        padding: "8px",
                                                                        borderRadius: "8px",
                                                                        display: "flex",
                                                                        transition: "transform 0.2s",
                                                                        textDecoration: "none"
                                                                    }}
                                                                    title={cleanPhone ? "Recordatorio WhatsApp" : "Número inválido"}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                                                    </svg>
                                                                </a>

                                                                <button
                                                                    onClick={() => handleDelete(appointment.id)}
                                                                    style={{
                                                                        background: "#fef2f2",
                                                                        border: "none",
                                                                        color: "#ef4444",
                                                                        cursor: "pointer",
                                                                        padding: "8px",
                                                                        borderRadius: "8px",
                                                                        display: "flex",
                                                                        transition: "transform 0.2s"
                                                                    }}
                                                                    title="Eliminar turno"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
                {pastAppointments.length > 0 && (
                    <div style={{ marginTop: 40 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <button onClick={() => setShowPast(!showPast)}
                                className="btn-logout"
                                style={{
                                    padding: "10px 20px",
                                    borderRadius: 12,
                                    fontWeight: 600,
                                    fontSize: 15,
                                    border: "1px solid rgba(255, 255, 255, 0.5)",
                                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                                    backdropFilter: "blur(10px)",
                                    color: "#111",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                                }}>
                                {showPast ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                )}
                                {showPast ? "Ocultar Histórico" : "Ver Turnos Históricos"}
                            </button>

                            {showPast && pastAppointments.some(a => {
                                const date = new Date(a.appointment_time);
                                const oneYearAgo = new Date();
                                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
                                return date < oneYearAgo;
                            }) && (
                                    <button
                                        onClick={handleClearOldHistory}
                                        className="btn-delete"
                                        style={{
                                            padding: "8px 16px",
                                            borderRadius: 8,
                                            fontWeight: 500,
                                            fontSize: 13,
                                            border: "1px solid #fecaca",
                                            background: "rgba(254, 226, 226, 0.5)",
                                            backdropFilter: "blur(4px)",
                                            color: "#ef4444",
                                            cursor: "pointer",
                                            transition: "all 0.2s ease"
                                        }}>
                                        Limpiar 1 Año
                                    </button>
                                )}
                        </div>

                        <div className={`history-accordion ${showPast ? "open" : ""}`}>
                            <div style={{
                                padding: 24,
                                borderRadius: 20,
                                backgroundColor: "rgba(240, 244, 248, 0.4)", // Darker glass
                                backdropFilter: "blur(12px)",
                                border: "1px solid rgba(255, 255, 255, 0.2)",
                                boxShadow: "inset 0 2px 10px rgba(0,0,0,0.02)"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                    <h3 style={{
                                        margin: 0,
                                        fontWeight: 600,
                                        fontSize: 18,
                                        color: "#333"
                                    }}>
                                        Historial Completo
                                    </h3>

                                    <div style={{ position: "relative" }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Buscar por cliente..."
                                            value={historySearch}
                                            onChange={(e) => setHistorySearch(e.target.value)}
                                            className="input-field"
                                            style={{
                                                paddingLeft: 36,
                                                paddingTop: 8,
                                                paddingBottom: 8,
                                                width: 200,
                                                backgroundColor: "rgba(255,255,255,0.7)"
                                            }}
                                        />
                                    </div>
                                </div>

                                {filteredPastAppointments.length === 0 ? (
                                    <p style={{ textAlign: "center", color: "#666", padding: 20 }}>No se encontraron turnos en el historial.</p>
                                ) : (
                                    <table style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                        backgroundColor: "rgba(255, 255, 255, 0.3)",
                                        borderRadius: 12,
                                        overflow: "hidden"
                                    }}>
                                        <thead>
                                            <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.08)", backgroundColor: "rgba(0,0,0,0.02)" }}>
                                                <th style={{ padding: "12px 16px", color: "#555", fontWeight: 600, fontSize: 13 }}>Fecha</th>
                                                <th style={{ padding: "12px 16px", color: "#555", fontWeight: 600, fontSize: 13 }}>Hora</th>
                                                <th style={{ padding: "12px 16px", color: "#555", fontWeight: 600, fontSize: 13 }}>Cliente</th>
                                                <th style={{ padding: "12px 16px", color: "#555", fontWeight: 600, fontSize: 13 }}>Teléfono</th>
                                                <th style={{ padding: "12px 16px", color: "#555", fontWeight: 600, fontSize: 13 }}>Servicio</th>
                                                <th style={{ padding: "12px 16px", color: "#555", fontWeight: 600, fontSize: 13 }}>Profesional</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPastAppointments.map((a) => {
                                                const date = new Date(a.appointment_time)
                                                const dateText = date.toLocaleDateString()
                                                const timeText = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

                                                return (
                                                    <tr key={a.id} className="admin-table-row" style={{ borderBottom: "1px solid rgba(0,0,0,0.03)" }}>
                                                        <td style={{ padding: "12px 16px", fontSize: 14 }}>{dateText}</td>
                                                        <td style={{ padding: "12px 16px", fontSize: 14, color: "#444", fontWeight: 500 }}>{timeText}</td>
                                                        <td style={{ padding: "12px 16px", fontSize: 14, color: "#222", fontWeight: 500 }}>{a.client_name}</td>
                                                        <td style={{ padding: "12px 16px", fontSize: 14, color: "#666" }}>{a.phone}</td>
                                                        <td style={{ padding: "12px 16px", fontSize: 14, color: "#666" }}>{a.service_name || "-"}</td>
                                                        <td style={{ padding: "12px 16px", fontSize: 14, color: "#555" }}>{a.professionals?.name}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Team Management Section */}
            <div style={{ maxWidth: 1100, margin: "40px auto 0", padding: "0 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <button onClick={() => setShowTeam(!showTeam)}
                        className="btn-logout"
                        style={{
                            padding: "10px 20px",
                            borderRadius: 12,
                            fontWeight: 600,
                            fontSize: 15,
                            border: "1px solid rgba(255, 255, 255, 0.5)",
                            backgroundColor: "rgba(255, 255, 255, 0.8)",
                            backdropFilter: "blur(10px)",
                            color: "#111",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                        }}>
                        {showTeam ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        )}
                        {showTeam ? "Ocultar Mi Equipo" : "Gestionar Mi Equipo"}
                    </button>
                </div>

                <div className={`history-accordion ${showTeam ? "open" : ""}`}>
                    <div style={{
                        padding: 30,
                        borderRadius: 24,
                        backgroundColor: "rgba(255, 255, 255, 0.75)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255, 255, 255, 0.4)",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.04)"
                    }}>
                        <h3 style={{
                            margin: "0 0 24px 0",
                            fontWeight: 700,
                            fontSize: 20,
                            color: "#111"
                        }}>
                            Profesionales
                        </h3>

                        <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
                            <div style={{ flex: "1 1 300px" }}>
                                <form onSubmit={handleAddProfessional} style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                                    <input
                                        type="text"
                                        placeholder="Nombre del nuevo profesional..."
                                        value={newProfessionalName}
                                        onChange={(e) => setNewProfessionalName(e.target.value)}
                                        className="input-field"
                                        required
                                        style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={savingProfessional}
                                        className="btn-primary"
                                        style={{
                                            padding: "0 20px",
                                            borderRadius: 12,
                                            fontWeight: 600,
                                            border: "none",
                                            backgroundColor: savingProfessional ? "#ccc" : "#111",
                                            color: "white",
                                            cursor: savingProfessional ? "not-allowed" : "pointer",
                                            whiteSpace: "nowrap",
                                            transition: "all 0.2s ease"
                                        }}
                                    >
                                        + Agregar
                                    </button>
                                </form>

                                {professionals.length === 0 ? (
                                    <p style={{ color: "#666", fontStyle: "italic" }}>No hay profesionales registrados.</p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                        {professionals.map(p => (
                                            <div key={p.id} style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "14px 20px",
                                                backgroundColor: "rgba(255,255,255,0.6)",
                                                border: "1px solid rgba(0,0,0,0.05)",
                                                borderRadius: 12,
                                                backdropFilter: "blur(4px)"
                                            }}>
                                                <span style={{ fontWeight: 500, color: "#333", display: "flex", alignItems: "center", gap: 10 }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#e88aa3", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 13 }}>
                                                        {p.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    {p.name}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteProfessional(p.id)}
                                                    className="btn-delete"
                                                    style={{
                                                        background: "none",
                                                        border: "none",
                                                        color: "#ef4444",
                                                        cursor: "pointer",
                                                        padding: "6px",
                                                        borderRadius: "6px",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        transition: "background-color 0.2s"
                                                    }}
                                                    title={`Eliminar a ${p.name}`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: "1 1 250px", backgroundColor: "rgba(0,0,0,0.02)", padding: 20, borderRadius: 16, border: "1px dashed rgba(0,0,0,0.1)" }}>
                                <p style={{ margin: "0 0 10px 0", fontSize: 14, color: "#555", lineHeight: 1.5 }}>
                                    💡 <strong>Nota:</strong> Al agregar a un profesional aquí, automáticamente aparecerá en las opciones de "Nuevo Turno" y en la pantalla de reservas de los clientes.
                                </p>
                                <p style={{ margin: 0, fontSize: 13, color: "#888", lineHeight: 1.5 }}>
                                    Asegúrate de no eliminar a un profesional que tenga turnos próximos asignados para evitar errores en la base de datos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal for New Appointment */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div
                        style={{
                            backgroundColor: "white",
                            width: "100%",
                            maxWidth: 500,
                            borderRadius: 24,
                            padding: 40,
                            boxShadow: "0 24px 48px rgba(0,0,0,0.12)",
                            position: "relative"
                        }}
                        onClick={e => e.stopPropagation()} // Prevent close when clicking inside
                    >
                        <button
                            onClick={() => setShowModal(false)}
                            style={{
                                position: "absolute",
                                top: 20,
                                right: 20,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "#999",
                                padding: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "50%",
                                transition: "background-color 0.2s"
                            }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>

                        <h2 style={{ margin: "0 0 24px 0", fontSize: 24, fontWeight: 700, color: "#111" }}>
                            Cargar Nuevo Turno
                        </h2>

                        <form onSubmit={handleSaveAppointment} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div>
                                <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "#555" }}>
                                    Nombre del Cliente
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="input-field"
                                    placeholder="Ej. Juan Pérez"
                                    value={formData.client_name}
                                    onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "#555" }}>
                                    Teléfono
                                </label>
                                <input
                                    type="tel"
                                    required
                                    className="input-field"
                                    placeholder="Ej. 11 5555 4444"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <div>
                                <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "#555" }}>
                                    Servicio
                                </label>
                                <select
                                    required
                                    className="input-field"
                                    style={{ appearance: "none" }}
                                    value={formData.service_name}
                                    onChange={e => setFormData({ ...formData, service_name: e.target.value })}
                                >
                                    <option value="" disabled>Selecciona un servicio</option>
                                    <option value="Manicuría Semipermanente">Manicuría Semipermanente - $4500</option>
                                    <option value="Limpieza Facial Profunda">Limpieza Facial Profunda - $6000</option>
                                    <option value="Lifting de Pestañas">Lifting de Pestañas - $5500</option>
                                    <option value="Masaje Relajante">Masaje Relajante - $7000</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "#555" }}>
                                    Profesional
                                </label>
                                <select
                                    required
                                    className="input-field"
                                    style={{ appearance: "none" }}
                                    value={formData.professional_id}
                                    onChange={e => setFormData({ ...formData, professional_id: e.target.value })}
                                >
                                    <option value="" disabled>Selecciona un profesional</option>
                                    {professionals.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: "flex", gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "#555" }}>
                                        Fecha
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        className="input-field"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600, color: "#555" }}>
                                        Hora
                                    </label>
                                    <input
                                        type="time"
                                        required
                                        className="input-field"
                                        value={formData.time}
                                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary"
                                style={{
                                    marginTop: 16,
                                    padding: "14px",
                                    borderRadius: 12,
                                    fontWeight: 600,
                                    fontSize: 16,
                                    border: "none",
                                    backgroundColor: saving ? "#ccc" : "#111",
                                    color: "white",
                                    cursor: saving ? "not-allowed" : "pointer",
                                    transition: "all 0.2s ease"
                                }}
                            >
                                {saving ? "Guardando..." : "Guardar Turno"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>

    )
}