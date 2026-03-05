import { motion } from "framer-motion";
import { Clock, User, MapPin, CheckCircle2, Circle, Loader2, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { appointmentsAPI, roomsAPI } from "@/lib/api";
import { toast } from "sonner";

interface Appointment {
  _id?: string;
  id?: string;
  appointment_date: string;
  appointment_time: string;
  end_time?: string;
  therapy?: { name: string };
  therapy_id?: string;
  patient?: { name: string };
  patient_id?: string;
  room?: { name: string };
  room_id?: string;
  therapist?: { name: string };
  therapist_id?: string;
  status?: string;
}

const statusStyles = {
  completed: {
    bg: "bg-primary/10",
    border: "border-primary/30",
    icon: CheckCircle2,
    iconColor: "text-primary",
    label: "Completed",
    labelBg: "bg-primary/20 text-primary",
  },
  "in-progress": {
    bg: "bg-highlight/10",
    border: "border-highlight/30",
    icon: Clock,
    iconColor: "text-highlight",
    label: "In Progress",
    labelBg: "bg-highlight/20 text-highlight",
  },
  upcoming: {
    bg: "bg-muted/50",
    border: "border-border",
    icon: Circle,
    iconColor: "text-muted-foreground",
    label: "Upcoming",
    labelBg: "bg-muted text-muted-foreground",
  },
};

export default function DailySchedule() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const { data: appointments = [], isLoading: loadingAppointments, error } = useQuery({
    queryKey: ["appointments", todayStr],
    queryFn: async () => {
      try {
        const allAppointments = await appointmentsAPI.getAll({ date: todayStr });
        return allAppointments || [];
      } catch (error: any) {
        toast.error(error.message || "Failed to load appointments");
        return [];
      }
    },
  });

  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      try {
        return await roomsAPI.getAll();
      } catch (error: any) {
        toast.error(error.message || "Failed to load rooms");
        return [];
      }
    },
  });

  const getAppointmentStatus = (apt: Appointment): "completed" | "in-progress" | "upcoming" => {
    if (!apt.appointment_time) return "upcoming";
    
    const now = new Date();
    const aptTime = new Date(`${todayStr}T${apt.appointment_time}`);
    const endTime = apt.end_time ? new Date(`${todayStr}T${apt.end_time}`) : null;

    if (endTime && now > endTime) return "completed";
    if (now >= aptTime && (!endTime || now <= endTime)) return "in-progress";
    return "upcoming";
  };

  const groupedByRoom = rooms.reduce((acc, room: any) => {
    acc[room._id] = {
      name: room.name,
      appointments: appointments.filter((apt: Appointment) => {
        return apt.room_id === room._id || apt.room?._id === room._id;
      }),
    };
    return acc;
  }, {} as Record<string, { name: string; appointments: Appointment[] }>);

  const completedCount = appointments.filter((apt: Appointment) => getAppointmentStatus(apt) === "completed").length;
  const inProgressCount = appointments.filter((apt: Appointment) => getAppointmentStatus(apt) === "in-progress").length;
  const upcomingCount = appointments.filter((apt: Appointment) => getAppointmentStatus(apt) === "upcoming").length;

  const sortedAppointments = [...appointments].sort((a: Appointment, b: Appointment) => {
    const timeA = a.appointment_time || "";
    const timeB = b.appointment_time || "";
    return timeA.localeCompare(timeB);
  });

  if (loadingAppointments || loadingRooms) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading schedule...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h3 className="font-semibold text-destructive mb-2">Failed to load schedule</h3>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-3xl font-semibold text-foreground">
              Daily Schedule
            </h1>
            <p className="text-muted-foreground mt-1">
              {today.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex gap-2">
            {Object.entries(statusStyles).map(([key, style]) => (
              <span
                key={key}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${style.labelBg}`}
              >
                {style.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-4"
        >
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-3xl font-display font-bold text-primary">
              {completedCount}
            </p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-3xl font-display font-bold text-highlight">
              {inProgressCount}
            </p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <p className="text-3xl font-display font-bold text-muted-foreground">
              {upcomingCount}
            </p>
            <p className="text-sm text-muted-foreground">Upcoming</p>
          </div>
        </motion.div>

        {/* Room-wise Schedule */}
        {rooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-12 text-center"
          >
            <MapPin className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">No rooms available</h3>
            <p className="text-muted-foreground">
              Please add rooms to view the schedule
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {Object.entries(groupedByRoom).map(([roomId, roomData], roomIndex) => (
              <motion.div
                key={roomId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + roomIndex * 0.1 }}
                className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
              >
                <div className="p-4 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">{roomData.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {roomData.appointments.length} appointment{roomData.appointments.length !== 1 ? 's' : ''} today
                  </p>
                </div>

                <div className="p-3 space-y-3 max-h-[500px] overflow-y-auto">
                  {roomData.appointments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      No appointments
                    </p>
                  ) : (
                    roomData.appointments.map((item: Appointment, index: number) => {
                      const status = getAppointmentStatus(item);
                      const style = statusStyles[status];
                      const Icon = style.icon;
                      const therapyName = item.therapy?.name || item.therapy_id || "Therapy";
                      const patientName = item.patient?.name || item.patient_id || "Patient";
                      const therapistName = item.therapist?.name || item.therapist_id || "Therapist";
                      const timeStr = item.appointment_time?.substring(0, 5) || "";
                      const endTimeStr = item.end_time?.substring(0, 5) || "";

                      return (
                        <motion.div
                          key={item._id || item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.05 }}
                          className={`p-4 rounded-xl ${style.bg} border ${style.border}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold text-foreground">{therapyName}</p>
                              <p className="text-xs text-muted-foreground">
                                {timeStr} {endTimeStr ? `- ${endTimeStr}` : ""}
                              </p>
                            </div>
                            <Icon className={`w-5 h-5 ${style.iconColor}`} />
                          </div>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3" />
                              {patientName}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              {therapistName}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Timeline View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-sm"
        >
          <h3 className="font-display text-lg font-semibold mb-6">Timeline</h3>
          {sortedAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">No appointments today</h3>
              <p className="text-muted-foreground">
                Schedule appointments to see them in the timeline
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-4">
                {sortedAppointments.map((item: Appointment, index: number) => {
                  const status = getAppointmentStatus(item);
                  const style = statusStyles[status];
                  const Icon = style.icon;
                  const therapyName = item.therapy?.name || item.therapy_id || "Therapy";
                  const patientName = item.patient?.name || item.patient_id || "Patient";
                  const roomName = item.room?.name || item.room_id || "Room";
                  const timeStr = item.appointment_time?.substring(0, 5) || "";

                  return (
                    <motion.div
                      key={item._id || item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.05 }}
                      className="relative flex gap-4 pl-12"
                    >
                      {/* Timeline dot */}
                      <div className={`absolute left-4 w-5 h-5 rounded-full ${style.bg} border-2 ${style.border} flex items-center justify-center`}>
                        <Icon className={`w-3 h-3 ${style.iconColor}`} />
                      </div>

                      <div className={`flex-1 p-4 rounded-xl ${style.bg} border ${style.border}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{therapyName}</p>
                            <p className="text-sm text-muted-foreground">{patientName}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">{timeStr}</p>
                            <p className="text-xs text-muted-foreground">{roomName}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </MainLayout>
  );
}
