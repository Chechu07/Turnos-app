import React, { useEffect, useState } from "react"
import { supabase } from "../api/supabaseClient"
import petalos from "../pages/image/petalo.png"


function generarSlots(start, end, duracionMin) {
  const slots = []

  let actual = new Date(`1970-01-01T${start}`)
  const fin = new Date(`1970-01-01T${end}`)

  while (actual < fin) {
    slots.push(
      actual.toTimeString().slice(0, 5)
    )
    actual = new Date(actual.getTime() + duracionMin * 60000)
  }

  return slots
}


export default function Client() {
  const [availability, setAvailability] = useState([])
  const [booked, setBooked] = useState([])
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [slotSelected, setSlotSelected] = useState(null)
  const [profSelected, setProfSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [professionals, setProfessionals] = useState([])
  const [selectedProfessional, setSelectedProfessional] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [lastBooking, setLastBooking] = useState(null)

  // Lista estática de servicios
  const [services] = useState([
    { id: 1, name: "Manicuría Semipermanente", price: 4500 },
    { id: 2, name: "Esculpidas en Gel", price: 6500 },
    { id: 3, name: "Lifting de Pestañas", price: 5000 },
    { id: 4, name: "Perfilado de Cejas", price: 3500 },
    { id: 5, name: "Limpieza Facial Profunda", price: 8000 }
  ])
  const [selectedService, setSelectedService] = useState("")

  const formRef = React.useRef(null)
  const duracionServicio = 45

  useEffect(() => {
    async function load() {
      const { data: profData } = await supabase
        .from("professionals")
        .select("id,name")

      // Mapeo temporal de servicios a profesionales (hasta tener la tabla relacional en DB)
      const profsWithMockServices = (profData || []).map((prof, idx) => {
        // Por defecto, profesioles pares hacen uñas/facial, impares hacen pestañas/uñas.
        // Si hay un solo profesional, hace todo.
        let sIds = [1, 2, 3, 4, 5];
        if (profData?.length > 1) {
          sIds = idx % 2 === 0 ? [1, 2, 5] : [3, 4, 1]; // 1 es compartido
        }
        return { ...prof, serviceIds: sIds };
      });

      setProfessionals(profsWithMockServices)
    }

    load()
  }, [])

  useEffect(() => {
    if (!selectedProfessional || !selectedDate) return

    async function loadAvailability() {
      const { data } = await supabase
        .from("availability")
        .select(
          `day_of_week,
          start_time,
          end_time,
          professional_id`)
        .eq("professional_id", selectedProfessional)

      setAvailability(data || [])

      const { data: bookedData } = await supabase
        .from("appointments")
        .select("appointment_time, professional_id")
        .eq("professional_id", selectedProfessional)
        .gte("appointment_time", `${selectedDate}T00:00:00`)
        .lt("appointment_time", `${selectedDate}T23:59:59`)

      setBooked(bookedData || [])
    }
    loadAvailability()
  }, [selectedProfessional, selectedDate])

  async function reservarTurno(hora, professionalId) {
    if (saving) return

    if (phone.length < 10) {
      setSuccessMessage("El número debe tener al menos 10 dígitos")
      setSaving(false)
      return
    }

    setSaving(true)


    const fecha = selectedDate

    const fechaCompleta = `${fecha}T${hora}:00`

    const srvNameInsert = services.find(s => s.id.toString() === selectedService.toString())?.name || null

    const { error } = await supabase
      .from("appointments")
      .insert([
        {
          client_name: name,
          phone: phone,
          professional_id: professionalId,
          service_name: srvNameInsert,
          appointment_time: fechaCompleta
        }
      ])

    if (error) {
      console.log("Error al reservar:", error);
    }
    else {
      setSuccessMessage("Turno reservado correctamente ✨")

      const srvName = services.find(s => s.id.toString() === selectedService.toString())?.name || "Servicio"
      const profName = professionals.find(p => p.id.toString() === professionalId.toString())?.name || "Profesional"

      setLastBooking({
        name: name,
        date: selectedDate,
        time: hora,
        serviceName: srvName,
        profName: profName
      })
      setName("")
      setPhone("")
      setSlotSelected(null)

      setBooked((prev) => [
        ...prev,
        {
          appointment_time: fechaCompleta,
          professional_id: selectedProfessional
        }
      ])
    }

    setSaving(false)
  }

  return (
    <div style={{
      height: "100vh",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#fcf9f9", // Very light off-white/pinkish background
      fontFamily: "'Inter', sans-serif",
      backgroundImage: `url(${petalos})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      margin: 0,
      padding: 0,
      position: "fixed",
      top: 0,
      left: 0
    }}>
      {/* Inject Global Styles & Fonts */}
      <style>
        {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');
                
                * {
                    box-sizing: border-box;
                }
                
                .glass-card {
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: 24px;
                    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.05), 0 5px 15px rgba(0,0,0,0.03);
                }
                
                .btn-luxury {
                    background-color: #f48fb1; /* Primary pastel pink */
                    color: white;
                    border: none;
                    border-radius: 100px; /* Fully rounded pill */
                    font-weight: 500;
                    letter-spacing: 0.5px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                    box-shadow: 0 4px 15px rgba(244, 143, 177, 0.3);
                }
                
                .btn-luxury:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(244, 143, 177, 0.45);
                    background-color: #f06292; /* Slightly darker pink on hover */
                }
                
                .btn-luxury:active:not(:disabled) {
                    transform: translateY(0);
                }
                
                .btn-luxury:disabled {
                    background-color: #f8cdda;
                    color: #fff;
                    cursor: not-allowed;
                    box-shadow: none;
                }
                
                .input-luxury {
                    width: 100%;
                    padding: 14px 18px;
                    border-radius: 16px;
                    border: 1px solid #f0f0f0;
                    background-color: #fdfdfd;
                    font-family: inherit;
                    font-size: 15px;
                    color: #333;
                    transition: all 0.2s ease;
                    outline: none;
                }
                
                .input-luxury:focus {
                    border-color: #f48fb1;
                    background-color: #fff;
                    box-shadow: 0 0 0 3px rgba(244, 143, 177, 0.15);
                }
                
                /* Custom Spin Animation */
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .spinner {
                    position: relative;
                    width: 20px;
                    height: 20px;
                }
                .spinner::before {
                    content: '';
                    box-sizing: border-box;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 20px;
                    height: 20px;
                    margin-top: -10px;
                    margin-left: -10px;
                    border-radius: 50%;
                    border: 2px solid transparent;
                    border-top-color: #fff;
                    border-right-color: #fff;
                    animation: spin 0.8s linear infinite;
                }
                
                /* Slot Selection Styling */
                .slot-chip {
                    padding: 12px 0;
                    font-weight: 500;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-align: center;
                    font-size: 14px;
                    background-color: #fff;
                    border: 1px solid #f0f0f0;
                    color: #555;
                }
                
                .slot-chip:hover:not(.selected) {
                    border-color: #f8bbd0;
                    background-color: #fffafb;
                    color: #d81b60;
                }
                
                .slot-chip.selected {
                    background-color: #fce4ec; /* Light pastel pink */
                    border-color: #f48fb1;
                    color: #d81b60; /* Deep pink text */
                    font-weight: 600;
                    box-shadow: 0 4px 12px rgba(244, 143, 177, 0.2);
                }
                
                /* Custom Scrollbar for form */
                .custom-scroll::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                    background-color: rgba(244, 143, 177, 0.3);
                    border-radius: 10px;
                }
            `}
      </style>

      {!showBookingForm ? (
        <div style={{ textAlign: "center", padding: "0 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>

          <div style={{
            display: "inline-block",
            padding: "8px 20px",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginBottom: 24,
            borderRadius: 30,
            color: "#d81b60", // Darker pink for contrast
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(244, 143, 177, 0.3)"
          }}>
            Secret Seduction
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(46px, 8vw, 64px)", // Responsive size
            fontWeight: 600,
            fontStyle: "italic",
            margin: 0,
            lineHeight: 1.1,
            color: "#2c2c2c"
          }}>
            Tu momento de <br />
            <span style={{ color: "#f48fb1" }}>
              cuidarte
            </span>
          </h1>

          <p style={{
            marginTop: 24,
            marginBottom: 40,
            fontSize: "clamp(16px, 4vw, 18px)",
            color: "#666",
            maxWidth: "400px",
            lineHeight: 1.6,
            fontWeight: 300
          }}>
            Descubre la belleza en cada detalle. Reserva tu cita de manera exclusiva con nuestros profesionales.
          </p>

          <button
            onClick={() => setShowBookingForm(true)}
            className="btn-luxury"
            style={{
              padding: "18px 48px",
              fontSize: 18,
            }}
          >
            Reservar Turno
          </button>
        </div>
      ) : (
        <div
          ref={formRef}
          className="glass-card custom-scroll"
          style={{
            width: "92%",
            maxWidth: 480,
            maxHeight: "85vh",
            overflowY: "auto",
            padding: "40px 30px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>


          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            textAlign: "center",
            marginBottom: 30,
            fontWeight: 700,
            fontSize: 28,
            color: "#2c2c2c"
          }}>
            Reserva tu Cita
          </h1>

          <div style={{ marginBottom: 24, width: "100%" }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: 8, color: "#555", fontSize: 14 }}>
              1. Selecciona el servicio</label>
            <select
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value);
                // Reseteamos el profesional y fecha al cambiar el servicio
                setSelectedProfessional("");
                setSelectedDate("");
              }}
              className="input-luxury"
            >
              <option value="">Elegir servicio...</option>
              {services.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} - ${srv.price}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 24, width: "100%" }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: 8, color: "#555", fontSize: 14 }}>
              2. Selecciona el profesional</label>
            <select
              value={selectedProfessional}
              onChange={(e) => setSelectedProfessional(e.target.value)}
              className="input-luxury"
              disabled={!selectedService}
            >
              <option value="">{selectedService ? "Elegir profesional..." : "Primero elige un servicio"}</option>
              {professionals
                .filter(prof => prof.serviceIds?.includes(parseInt(selectedService)))
                .map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ marginBottom: 30, width: "100%" }}>
            <label style={{ display: "block", fontWeight: 500, marginBottom: 8, color: "#555", fontSize: 14 }}>
              3. Selecciona la fecha</label>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-luxury"
            />
          </div>

          {successMessage && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", marginBottom: 15 }}>
              <div style={{
                backgroundColor: "#e6f4ea",
                color: "#1e7e34",
                padding: "12px 16px",
                borderRadius: 8,
                marginBottom: 15,
                width: "100%",
                maxWidth: 300,
                textAlign: "center",
                fontWeight: 500,
                border: "1px solid #c3e6cb"
              }}>
                {successMessage}
              </div>

              {/* Client-to-Admin WhatsApp Notification Button */}
              {lastBooking && (
                <a
                  href={`https://wa.me/5492974364103?text=${encodeURIComponent(`Hola! Reservé para ${lastBooking.serviceName} con ${lastBooking.profName} a nombre de ${lastBooking.name} para el día ${lastBooking.date} a las ${lastBooking.time}hs.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    backgroundColor: "#25D366",
                    color: "white",
                    padding: "14px 20px",
                    borderRadius: "12px",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "15px",
                    width: "100%",
                    maxWidth: 300,
                    boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(37, 211, 102, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 211, 102, 0.3)";
                  }}
                  onClick={() => {
                    // Optional: Reset form completely after they click WhatsApp
                    setShowBookingForm(false);
                    setSuccessMessage("");
                    setLastBooking(null);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                  Notificar por WhatsApp
                </a>
              )}

              <button
                onClick={() => {
                  setShowBookingForm(false);
                  setSuccessMessage("");
                }}
                style={{
                  marginTop: 15,
                  background: "none",
                  border: "none",
                  color: "#666",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: 14
                }}
              >
                Volver al inicio
              </button>
            </div>
          )}

          {slotSelected && (
            <div style={{
              marginTop: 20,
              marginBottom: 20,
              padding: 24,
              backgroundColor: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(244, 143, 177, 0.3)",
              borderRadius: 20,
              display: "flex",
              flexDirection: "column",
              width: "100%"
            }}>

              <h3 style={{
                fontFamily: "'Playfair Display', serif",
                marginBottom: 20,
                textAlign: "center",
                color: "#d81b60",
                fontSize: 20
              }}>
                Confirmar a las {slotSelected}hs
              </h3>

              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Tu nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-luxury"
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const justNumbers = e.target.value.replace(/\D/g, "")
                    if (justNumbers.length <= 12) {
                      setPhone(justNumbers)
                    }
                  }}
                  placeholder="Tu celular (ej: 2974352845)"
                  className="input-luxury"
                />
              </div>

              <button
                onClick={() => reservarTurno(slotSelected, profSelected)}
                disabled={!name.trim() || !phone.trim() || saving}
                className="btn-luxury"
                style={{
                  padding: "16px",
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 10
                }}
              >
                {saving ? (
                  <>
                    <div className="spinner"></div>
                    Guardando...
                  </>
                ) : "Confirmar Reserva"}
              </button>
            </div>
          )}

          {selectedDate && availability.map((a, i) => {
            const slots = generarSlots(
              a.start_time,
              a.end_time,
              duracionServicio
            )

            const horariosOcupados = booked
              .filter(b => b.professional_id === a.professional_id)
              .map(b => b.appointment_time.slice(11, 16))


            return (
              <div key={i} style={{ marginBottom: 20, width: "100%" }}>

                <h3 style={{
                  fontFamily: "'Playfair Display', serif",
                  marginBottom: 16,
                  textAlign: "center",
                  color: "#333",
                  fontSize: 18
                }}>
                  Horarios para {a.professionals?.name}
                </h3>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(75px, 1fr))",
                  gap: "10px",
                  width: "100%"
                }}>

                  {slots
                    .filter(s => !horariosOcupados.includes(s))
                    .map((s, idx) => (
                      <div
                        key={idx}
                        className={`slot-chip ${slotSelected === s ? 'selected' : ''}`}
                        onClick={() => {
                          setSlotSelected(s)
                          setProfSelected(a.professional_id)
                          // Smooth scroll to form
                          setTimeout(() => {
                            if (formRef.current) {
                              formRef.current.scrollTo({ top: formRef.current.scrollHeight, behavior: 'smooth' });
                            }
                          }, 100);
                        }}
                      >
                        {s}
                      </div>
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}