import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ensureStudentCardToken } from "@/lib/student-card-server";
import { LoginScreen } from "@/components/login-screen";
import { CabinetApp } from "@/components/cabinet/cabinet-app";

/**
 * Единственный видимый маршрут прототипа: "/".
 * Незалогиненный видит экран входа, залогиненный — личный кабинет.
 * Внутри кабинета разделы переключаются на клиенте (SPA-навигация).
 */
export default async function RootPage() {
  const session = await getSession();
  if (!session) return <LoginScreen />;

  const user = await db.user.findUnique({
    where: { id: session.uid },
    include: { student: true },
  });
  if (!user) {
    // сессия есть, а учётки нет (например, база пересеяна) — показываем вход;
    // cookie перезапишется при следующем входе
    return <LoginScreen />;
  }

  const unread = await db.notification.count({
    where: { userId: user.id, readAt: null },
  });

  // Электронный студенческий выпускается при первом открытии профиля.
  // Ошибка выпуска не должна блокировать вход в кабинет.
  let cardToken: string | null = null;
  if (user.student) {
    try {
      cardToken = await ensureStudentCardToken(user.student.id);
    } catch {
      cardToken = user.student.cardToken;
    }
  }

  return (
    <CabinetApp
      user={{
        id: user.id,
        login: user.login,
        name: user.name,
        role: user.role === "STAFF" ? "STAFF" : "STUDENT",
        avatarColor: user.avatarColor,
        cardToken,
        student: user.student
          ? {
              faculty: user.student.faculty,
              program: user.student.program,
              course: user.student.course,
              groupName: user.student.groupName,
              recordBook: user.student.recordBook,
              studyForm: user.student.studyForm,
              status: user.student.status,
              entryYear: user.student.entryYear,
              curatorName: user.student.curatorName,
            }
          : null,
      }}
      initialUnread={unread}
    />
  );
}
