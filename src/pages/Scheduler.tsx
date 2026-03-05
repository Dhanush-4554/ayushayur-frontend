import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock, X, AlertTriangle, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appointmentsAPI, therapiesAPI, roomsAPI, therapistsAPI, patientsAPI } from "@/lib/api";
import { toast } from "sonner";

interface Appointment {
  _id?: string;
  id?: string;
  appointment_date: string;
  appointment_time: string;
  end_time?: string;
  therapy_id?: string;
  therapy?: { name: string; duration: number; gender_restricted?: boolean };
  patient_id?: string;
  patient?: { name: string; gender: string };
  therapist_id?: string;
  therapist?: { name: string; gender: string };
  room_id?: string;
  room?: { name: string };
  status?: string;
}

interface Therapy {
  _id: string;
  name: string;
  duration: number;
  gender_restricted?: boolean;
}

interface Room {
  _id: string;
  name: string;
}

interface Therapist {
  _id: string;
  name: string;
  gender: string;
}

interface Patient {
  _id: string;
  name: string;
  gender: string;
}

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
];

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Scheduler() {
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; time: string } | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const [newAppointment, setNewAppointment] = useState({
    therapy_id: "",
    patient_id: "",
    therapist_id: "",
    room_id: "",
    time: "",
    day: 0,
  });

  // Fetch all data
  const { data: therapies = [], isLoading: loadingTherapies } = useQuery({
    queryKey: ["therapies"],
    queryFn: async () => {
      try {
        return await therapiesAPI.getAll();
      } catch (error: any) {
        toast.error(error.message || "Failed to load therapies");
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

  const { data: therapists = [], isLoading: loadingTherapists } = useQuery({
    queryKey: ["therapists"],
    queryFn: async () => {
      try {
        return await therapistsAPI.getAll();
      } catch (error: any) {
        toast.error(error.message || "Failed to load therapists");
        return [];
      }
    },
  });

  const { data: patients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      try {
        return await patientsAPI.getAll();
      } catch (error: any) {
        toast.error(error.message || "Failed to load patients");
        return [];
      }
    },
  });

  // Get week date range
  const getWeekDates = () => {
    const dates = [];
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - start.getDay() + 1);
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const weekStartDate = weekDates[0];
  const weekEndDate = weekDates[5];

  // Fetch appointments for the current week
  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ["appointments", weekStartDate.toISOString().split('T')[0], weekEndDate.toISOString().split('T')[0]],
    queryFn: async () => {
      try {
        const allAppointments = await appointmentsAPI.getAll();
        // Filter appointments for the current week
        return allAppointments.filter((apt: Appointment) => {
          if (!apt.appointment_date) return false;
          const aptDate = new Date(apt.appointment_date);
          return aptDate >= weekStartDate && aptDate <= weekEndDate;
        });
      } catch (error: any) {
        toast.error(error.message || "Failed to load appointments");
        return [];
      }
    },
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await appointmentsAPI.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment scheduled successfully");
      setShowAddModal(false);
      setNewAppointment({ therapy_id: "", patient_id: "", therapist_id: "", room_id: "", time: "", day: 0 });
      setConflict(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to schedule appointment");
    },
  });

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentWeekStart(newDate);
  };

  const getAppointmentsForSlot = (day: number, time: string) => {
    const date = weekDates[day];
    const dateStr = date.toISOString().split('T')[0];
    
    return appointments.filter((apt: Appointment) => {
      const aptDate = apt.appointment_date ? new Date(apt.appointment_date).toISOString().split('T')[0] : '';
      const aptTime = apt.appointment_time?.substring(0, 5) || '';
      return aptDate === dateStr && aptTime === time;
    });
  };

  const checkConflicts = () => {
    const selectedTherapy = therapies.find((t: Therapy) => t._id === newAppointment.therapy_id);
    const selectedPatient = patients.find((p: Patient) => p._id === newAppointment.patient_id);
    const selectedTherapist = therapists.find((t: Therapist) => t._id === newAppointment.therapist_id);

    // Check gender restriction
    if (selectedTherapy?.gender_restricted && selectedPatient && selectedTherapist) {
      if (selectedPatient.gender !== selectedTherapist.gender) {
        return `${selectedTherapy.name} requires same-gender therapist. Please assign a ${selectedPatient.gender.toLowerCase()} therapist.`;
      }
    }

    // Check room availability
    const date = weekDates[newAppointment.day];
    const dateStr = date.toISOString().split('T')[0];
    const existingRoomAppointment = appointments.find(
      (apt: Appointment) => {
        const aptDate = apt.appointment_date ? new Date(apt.appointment_date).toISOString().split('T')[0] : '';
        const aptTime = apt.appointment_time?.substring(0, 5) || '';
        return aptDate === dateStr && 
               aptTime === newAppointment.time && 
               apt.room_id === newAppointment.room_id;
      }
    );
    if (existingRoomAppointment) {
      const roomName = rooms.find((r: Room) => r._id === newAppointment.room_id)?.name || "Room";
      return `${roomName} is already booked at this time.`;
    }

    // Check therapist availability
    const existingTherapistAppointment = appointments.find(
      (apt: Appointment) => {
        const aptDate = apt.appointment_date ? new Date(apt.appointment_date).toISOString().split('T')[0] : '';
        const aptTime = apt.appointment_time?.substring(0, 5) || '';
        return aptDate === dateStr && 
               aptTime === newAppointment.time && 
               apt.therapist_id === newAppointment.therapist_id;
      }
    );
    if (existingTherapistAppointment) {
      const therapistName = selectedTherapist?.name || "Therapist";
      return `${therapistName} is already scheduled at this time.`;
    }

    return null;
  };

  const handleSlotClick = (day: number, time: string) => {
    setSelectedSlot({ day, time });
    setNewAppointment({ ...newAppointment, day, time });
    setShowAddModal(true);
    setConflict(null);
  };

  const handleAddAppointment = async () => {
    const conflictMessage = checkConflicts();
    if (conflictMessage) {
      setConflict(conflictMessage);
      return;
    }

    const selectedTherapy = therapies.find((t: Therapy) => t._id === newAppointment.therapy_id);
    const date = weekDates[newAppointment.day];
    const dateStr = date.toISOString().split('T')[0];

    if (selectedTherapy) {
      const [hours, minutes] = newAppointment.time.split(':').map(Number);
      const endMinutes = hours * 60 + minutes + selectedTherapy.duration;
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;

      const appointmentData = {
        appointment_date: dateStr,
        appointment_time: `${newAppointment.time}:00`,
        end_time: endTime,
        therapy_id: newAppointment.therapy_id,
        patient_id: newAppointment.patient_id,
        therapist_id: newAppointment.therapist_id,
        room_id: newAppointment.room_id,
        status: "scheduled",
      };

      createAppointmentMutation.mutate(appointmentData);
    }
  };

  const isLoading = loadingTherapies || loadingRooms || loadingTherapists || loadingPatients || loadingAppointments;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading scheduler...</p>
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
              Therapy Scheduler
            </h1>
            <p className="text-muted-foreground mt-1">
              Schedule and manage therapy appointments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateWeek(-1)}
              className="rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium text-sm">
              {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[5].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateWeek(1)}
              className="rounded-xl"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Calendar Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
        >
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-border">
            <div className="p-4 border-r border-border bg-muted/30">
              <span className="text-sm font-medium text-muted-foreground">Time</span>
            </div>
            {weekDays.map((day, index) => (
              <div
                key={day}
                className="p-4 text-center border-r border-border last:border-r-0 bg-muted/30"
              >
                <p className="text-sm font-medium text-muted-foreground">{day}</p>
                <p className="text-lg font-semibold text-foreground">
                  {weekDates[index].getDate()}
                </p>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="max-h-[600px] overflow-y-auto">
            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-7 border-b border-border last:border-b-0">
                <div className="p-3 border-r border-border bg-muted/10">
                  <span className="text-xs font-medium text-muted-foreground">{time}</span>
                </div>
                {weekDays.map((_, dayIndex) => {
                  const slotAppointments = getAppointmentsForSlot(dayIndex, time);
                  
                  return (
                    <div
                      key={`${dayIndex}-${time}`}
                      onClick={() => handleSlotClick(dayIndex, time)}
                      className="p-1 border-r border-border last:border-r-0 min-h-[60px] hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      {slotAppointments.map((apt: Appointment) => {
                        const therapyName = apt.therapy?.name || apt.therapy_id || "Therapy";
                        const patientName = apt.patient?.name || apt.patient_id || "Patient";
                        const roomName = apt.room?.name || apt.room_id || "Room";
                        return (
                          <motion.div
                            key={apt._id || apt.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="p-2 rounded-lg bg-primary/20 border border-primary/30 text-xs mb-1"
                          >
                            <p className="font-semibold text-primary truncate">{therapyName}</p>
                            <p className="text-muted-foreground truncate">{patientName}</p>
                            <p className="text-muted-foreground/70 truncate">{roomName}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Legend */}
        {therapies.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-4"
          >
            {therapies.slice(0, 4).map((therapy: Therapy) => (
              <div key={therapy._id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-primary/40" />
                <span>{therapy.name} ({therapy.duration}min)</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Add Appointment Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-semibold">Schedule Therapy</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {conflict && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Scheduling Conflict</p>
                    <p className="text-sm text-destructive/80">{conflict}</p>
                  </div>
                </motion.div>
              )}

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Clock className="w-4 h-4" />
                  <span>
                    {weekDays[selectedSlot?.day || 0]}, {selectedSlot?.time}
                  </span>
                </div>

                <div>
                  <Label>Therapy</Label>
                  <Select
                    value={newAppointment.therapy_id}
                    onValueChange={(value) => setNewAppointment({ ...newAppointment, therapy_id: value })}
                  >
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="Select therapy" />
                    </SelectTrigger>
                    <SelectContent>
                      {therapies.map((therapy: Therapy) => (
                        <SelectItem key={therapy._id} value={therapy._id}>
                          {therapy.name} ({therapy.duration}min)
                          {therapy.gender_restricted && " ⚠️"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Patient</Label>
                  <Select
                    value={newAppointment.patient_id}
                    onValueChange={(value) => setNewAppointment({ ...newAppointment, patient_id: value })}
                  >
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient: Patient) => (
                        <SelectItem key={patient._id} value={patient._id}>
                          {patient.name} ({patient.gender})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Therapist</Label>
                  <Select
                    value={newAppointment.therapist_id}
                    onValueChange={(value) => setNewAppointment({ ...newAppointment, therapist_id: value })}
                  >
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="Select therapist" />
                    </SelectTrigger>
                    <SelectContent>
                      {therapists.map((therapist: Therapist) => (
                        <SelectItem key={therapist._id} value={therapist._id}>
                          {therapist.name} ({therapist.gender})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Room</Label>
                  <Select
                    value={newAppointment.room_id}
                    onValueChange={(value) => setNewAppointment({ ...newAppointment, room_id: value })}
                  >
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room: Room) => (
                        <SelectItem key={room._id} value={room._id}>{room.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleAddAppointment}
                  className="w-full mt-4 rounded-xl h-11 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={!newAppointment.therapy_id || !newAppointment.patient_id || !newAppointment.therapist_id || !newAppointment.room_id || createAppointmentMutation.isPending}
                >
                  {createAppointmentMutation.isPending ? "Scheduling..." : "Schedule Appointment"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
