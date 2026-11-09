"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { CabinetShell, type CabinetUserInfo } from "@/components/cabinet/cabinet-shell";
import { clearApiCache } from "@/components/cabinet/use-api";
import { NotificationsPanel } from "@/components/cabinet/notifications-panel";
import { AssistantPanel } from "@/components/cabinet/assistant-panel";
import { StudentHome } from "@/components/cabinet/sections/student-home";
import { StudentSchedule } from "@/components/cabinet/sections/student-schedule";
import { StudentGrades } from "@/components/cabinet/sections/student-grades";
import { StudentRequests } from "@/components/cabinet/sections/student-requests";
import { ProfileSection } from "@/components/cabinet/sections/profile-section";
import { StaffRequests } from "@/components/cabinet/sections/staff-requests";
import { StaffAnnouncements } from "@/components/cabinet/sections/staff-announcements";
import { StaffSchedule } from "@/components/cabinet/sections/staff-schedule";
import { StaffStudents } from "@/components/cabinet/sections/staff-students";
import { StaffCard } from "@/components/cabinet/sections/staff-card";
import { StaffImport } from "@/components/cabinet/sections/staff-import";
import { StaffAudit } from "@/components/cabinet/sections/staff-audit";

export type CabinetUser = CabinetUserInfo & {
  cardToken: string | null;
  student: {
    faculty: string;
    program: string;
    course: number;
    groupName: string;
    recordBook: string;
    studyForm: string;
    status: string;
    entryYear: number;
    curatorName: string | null;
  } | null;
};

export function CabinetApp({ user, initialUnread }: { user: CabinetUser; initialUnread: number }) {
  const [section, setSection] = useState<string>(user.role === "STAFF" ? "requests" : "home");
  const [unread, setUnread] = useState(initialUnread);
  const [notifOpen, setNotifOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // стираем локальные слепки данных: на общем устройстве они не должны
      // остаться после смены пользователя
      await clearApiCache();
      window.location.replace("/");
    }
  }

  const isStaff = user.role === "STAFF";

  return (
    <CabinetShell
      user={user}
      section={section}
      onNavigate={setSection}
      unread={unread}
      onOpenNotifications={() => setNotifOpen(true)}
      onLogout={logout}
      loggingOut={loggingOut}
    >
      {!isStaff && user.student && section === "home" && (
        <StudentHome
          student={user.student}
          userName={user.name}
          onNavigate={setSection}
          onOpenAssistant={() => setAssistantOpen(true)}
          onOpenNotifications={() => setNotifOpen(true)}
        />
      )}
      {!isStaff && user.student && section === "schedule" && <StudentSchedule />}
      {!isStaff && user.student && section === "grades" && <StudentGrades />}
      {!isStaff && user.student && section === "requests" && (
        <StudentRequests onOpenNotifications={() => setNotifOpen(true)} onUnreadChange={setUnread} />
      )}
      {!isStaff && user.student && section === "profile" && (
        <ProfileSection user={user} onUnreadChange={setUnread} />
      )}

      {isStaff && section === "requests" && <StaffRequests />}
      {isStaff && section === "announcements" && <StaffAnnouncements />}
      {isStaff && section === "schedule" && <StaffSchedule />}
      {isStaff && section === "students" && <StaffStudents />}
      {isStaff && section === "card" && <StaffCard />}
      {isStaff && section === "import" && <StaffImport />}
      {isStaff && section === "audit" && <StaffAudit />}
      {isStaff && section === "profile" && <ProfileSection user={user} onUnreadChange={setUnread} />}

      <NotificationsPanel
        open={notifOpen}
        onOpenChange={setNotifOpen}
        onUnreadChange={setUnread}
        onNavigate={(target) => {
          setNotifOpen(false);
          setSection(target);
        }}
      />

      {!isStaff && <AssistantPanel open={assistantOpen} onOpenChange={setAssistantOpen} />}

      {/* Плавающая кнопка ИИ-ассистента */}
      {!isStaff && !assistantOpen && (
        <button
          type="button"
          onClick={() => setAssistantOpen(true)}
          aria-label="Открыть ИИ-ассистента Дека"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-600/30 transition-transform active:scale-95 lg:bottom-6 lg:right-8"
        >
          <Sparkles className="h-6 w-6" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[8px] font-black text-teal-900">
            ИИ
          </span>
        </button>
      )}
    </CabinetShell>
  );
}
