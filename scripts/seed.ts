/**
 * Наполнение БД вымышленными данными для прототипа "Дека — цифровой деканат".
 * Запуск: tsx scripts/seed.ts [--force]
 *
 * Безопасность данных: наполнение НЕ перезаписывает непустую базу.
 *  — если в базе уже есть пользователи, скрипт просто сообщает об этом и выходит,
 *    ничего не удаляя (защита от случайной потери данных при старте/деплое);
 *  — для осознанной перезаписи демо-данными нужен явный флаг: `--force`
 *    или переменная окружения DEKA_SEED_FORCE=1.
 *
 * ВАЖНО: все ФИО, группы, аудитории, оценки и номера — вымышленные.
 * Даты генерируются относительно "сегодня" (Europe/Moscow, UTC+3 без перехода на летнее время),
 * чтобы прототип всегда выглядел живым.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const FORCE = process.argv.includes('--force') || process.env.DEKA_SEED_FORCE === '1'

// ── Время и даты (Москва = UTC+3, без DST) ─────────────────────────────
const MSK_OFFSET = 3 * 3600 * 1000
const RU_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const mskNow = () => new Date(Date.now() + MSK_OFFSET)
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000)
const isoDate = (d: Date) => d.toISOString().slice(0, 10)
/** "6 ноября" — человекочитаемая дата для текстов уведомлений */
const humanDate = (d: Date) => `${d.getUTCDate()} ${RU_MONTHS[d.getUTCMonth()]}`
const wdOf = (d: Date) => (d.getUTCDay() === 0 ? 7 : d.getUTCDay()) // 1..7
const dateAt = (y: number, m: number, day: number) => new Date(Date.UTC(y, m, day, 12))

async function main() {
  console.log('Наполняем базу вымышленными данными…')

  // ── Защита от перезаписи существующих данных ────────────────────────
  // Демо-сид — разрушительная операция (удаляет все записи). Поэтому
  // без явного --force / DEKA_SEED_FORCE=1 непустую базу не трогаем.
  const existingUsers = await prisma.user.count()
  if (existingUsers > 0 && !FORCE) {
    console.log(
      `В базе уже ${existingUsers} пользовател${existingUsers === 1 ? 'ь' : 'ей'} — данные не тронуты.\n` +
        'Чтобы перезаписать базу демо-данными, запустите: tsx scripts/seed.ts --force'
    )
    return
  }

  // очистка (порядок важен из-за связей)
  await prisma.auditLog.deleteMany()
  await prisma.assistantMessage.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.requestEvent.deleteMany()
  await prisma.serviceRequest.deleteMany()
  await prisma.requestType.deleteMany()
  await prisma.grade.deleteMany()
  await prisma.examItem.deleteMany()
  await prisma.scheduleChange.deleteMany()
  await prisma.scheduleSlot.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.studentProfile.deleteMany()
  await prisma.user.deleteMany()

  // ── Академический календарь ──────────────────────────────────────────
  const today = mskNow()
  const acYear = today.getUTCMonth() >= 8 ? today.getUTCFullYear() : today.getUTCFullYear() - 1
  const sessionYear = acYear + 1
  console.log(`Учебный год ${acYear}/${acYear + 1}, сегодня (МСК): ${isoDate(today)}`)

  const passwordHash = bcrypt.hashSync('demo1234', 10)

  // ── Пользователи ─────────────────────────────────────────────────────
  type StudentSeed = {
    login: string
    name: string
    color: string
    faculty: string
    program: string
    course: number
    group: string
    recordBook: string
    entryYear: number
    curator: string
  }
  const students: StudentSeed[] = [
    {
      login: 'student1', name: 'Ковалёва Анна Сергеевна', color: 'teal',
      faculty: 'Факультет информационных технологий', program: '09.03.03 Прикладная информатика',
      course: 2, group: 'ПИ-231', recordBook: 'ПИ-25-014', entryYear: acYear - 1, curator: 'Полякова Д. А.',
    },
    {
      login: 'student2', name: 'Соколов Дмитрий Андреевич', color: 'amber',
      faculty: 'Факультет экономики и менеджмента', program: '38.03.01 Экономика',
      course: 3, group: 'ЭК-321', recordBook: 'ЭК-24-087', entryYear: acYear - 2, curator: 'Абрамова В. В.',
    },
    {
      login: 'student3', name: 'Лебедева Мария Дмитриевна', color: 'violet',
      faculty: 'Факультет информационных технологий', program: '09.03.03 Прикладная информатика',
      course: 2, group: 'ПИ-231', recordBook: 'ПИ-25-021', entryYear: acYear - 1, curator: 'Полякова Д. А.',
    },
    {
      login: 'student4', name: 'Ерёмин Кирилл Павлович', color: 'rose',
      faculty: 'Факультет информационных технологий', program: '09.03.03 Прикладная информатика',
      course: 2, group: 'ПИ-231', recordBook: 'ПИ-25-033', entryYear: acYear - 1, curator: 'Полякова Д. А.',
    },
    {
      login: 'student5', name: 'Гусева Полина Игоревна', color: 'lime',
      faculty: 'Факультет экономики и менеджмента', program: '38.03.01 Экономика',
      course: 3, group: 'ЭК-321', recordBook: 'ЭК-24-102', entryYear: acYear - 2, curator: 'Абрамова В. В.',
    },
  ]

  const users: Record<string, string> = {}
  for (const s of students) {
    const u = await prisma.user.create({
      data: {
        login: s.login, passwordHash, role: 'STUDENT', name: s.name, avatarColor: s.color,
        student: {
          create: {
            faculty: s.faculty, program: s.program, course: s.course, groupName: s.group,
            recordBook: s.recordBook, entryYear: s.entryYear, curatorName: s.curator,
          },
        },
      },
    })
    users[s.login] = u.id
  }
  const staff = await prisma.user.create({
    data: {
      login: 'dekanat', passwordHash, role: 'STAFF',
      name: 'Смирнова Ольга Викторовна', avatarColor: 'teal',
    },
  })
  console.log(`— Пользователи: ${students.length} студентов + сотрудник деканата`)

  // ── Расписание (сетка пар: 09:00, 10:40, 12:40, 14:20, 16:00) ────────
  const T = [540, 640, 760, 860, 960]
  const slots: {
    groupName: string; weekday: number; slot: number; subjectName: string; kind: string;
    room: string; building?: string; teacherName: string
  }[] = [
    // ПИ-231
    { groupName: 'ПИ-231', weekday: 1, slot: 0, subjectName: 'Математический анализ', kind: 'Лекция', room: 'А-312', building: 'Главный корпус', teacherName: 'Демидова Е. П.' },
    { groupName: 'ПИ-231', weekday: 1, slot: 1, subjectName: 'Алгоритмы и структуры данных', kind: 'Лекция', room: 'А-305', building: 'Главный корпус', teacherName: 'Мельник О. С.' },
    { groupName: 'ПИ-231', weekday: 1, slot: 2, subjectName: 'Базы данных', kind: 'Лаборатория', room: '214 (КТ)', building: 'Корпус Б', teacherName: 'Хайдаров Р. Р.' },
    { groupName: 'ПИ-231', weekday: 2, slot: 0, subjectName: 'Английский язык', kind: 'Практика', room: 'Б-418', building: 'Корпус Б', teacherName: 'Барсукова Т. И.' },
    { groupName: 'ПИ-231', weekday: 2, slot: 1, subjectName: 'Операционные системы', kind: 'Лекция', room: 'А-310', building: 'Главный корпус', teacherName: 'Титов С. С.' },
    { groupName: 'ПИ-231', weekday: 2, slot: 2, subjectName: 'Веб-программирование', kind: 'Лекция', room: '214 (КТ)', building: 'Корпус Б', teacherName: 'Полякова Д. А.' },
    { groupName: 'ПИ-231', weekday: 3, slot: 0, subjectName: 'Алгоритмы и структуры данных', kind: 'Лаборатория', room: '214 (КТ)', building: 'Корпус Б', teacherName: 'Мельник О. С.' },
    { groupName: 'ПИ-231', weekday: 3, slot: 1, subjectName: 'Математический анализ', kind: 'Практика', room: 'А-314', building: 'Главный корпус', teacherName: 'Демидова Е. П.' },
    { groupName: 'ПИ-231', weekday: 3, slot: 2, subjectName: 'Веб-программирование', kind: 'Лаборатория', room: '216 (КТ)', building: 'Корпус Б', teacherName: 'Полякова Д. А.' },
    { groupName: 'ПИ-231', weekday: 4, slot: 0, subjectName: 'Базы данных', kind: 'Лекция', room: 'Б-201', building: 'Корпус Б', teacherName: 'Хайдаров Р. Р.' },
    { groupName: 'ПИ-231', weekday: 4, slot: 1, subjectName: 'Английский язык', kind: 'Практика', room: 'Б-420', building: 'Корпус Б', teacherName: 'Барсукова Т. И.' },
    { groupName: 'ПИ-231', weekday: 5, slot: 0, subjectName: 'Математический анализ', kind: 'Лекция', room: 'А-312', building: 'Главный корпус', teacherName: 'Демидова Е. П.' },
    { groupName: 'ПИ-231', weekday: 5, slot: 1, subjectName: 'Операционные системы', kind: 'Практика', room: 'А-306', building: 'Главный корпус', teacherName: 'Титов С. С.' },
    { groupName: 'ПИ-231', weekday: 5, slot: 3, subjectName: 'Физическая культура (электив)', kind: 'Электив', room: 'СК-1', building: 'Спорткомплекс', teacherName: 'Литвинов И. И.' },
    // ЭК-321
    { groupName: 'ЭК-321', weekday: 1, slot: 0, subjectName: 'Эконометрика', kind: 'Лекция', room: 'В-101', building: 'Корпус В', teacherName: 'Гуревич Л. М.' },
    { groupName: 'ЭК-321', weekday: 1, slot: 1, subjectName: 'Статистика', kind: 'Практика', room: 'В-204', building: 'Корпус В', teacherName: 'Абрамова В. В.' },
    { groupName: 'ЭК-321', weekday: 1, slot: 2, subjectName: 'Бухгалтерский учёт', kind: 'Лекция', room: 'В-308', building: 'Корпус В', teacherName: 'Шевцова М. М.' },
    { groupName: 'ЭК-321', weekday: 2, slot: 0, subjectName: 'Микроэкономика (продвинутый уровень)', kind: 'Лекция', room: 'В-101', building: 'Корпус В', teacherName: 'Кузнецов А. В.' },
    { groupName: 'ЭК-321', weekday: 2, slot: 1, subjectName: 'Английский язык (деловой)', kind: 'Практика', room: 'Б-402', building: 'Корпус Б', teacherName: 'Соколова Н. Ю.' },
    { groupName: 'ЭК-321', weekday: 3, slot: 0, subjectName: 'Финансовая математика', kind: 'Лекция', room: 'В-105', building: 'Корпус В', teacherName: 'Гуревич Л. М.' },
    { groupName: 'ЭК-321', weekday: 3, slot: 1, subjectName: 'Эконометрика', kind: 'Лаборатория', room: 'В-210', building: 'Корпус В', teacherName: 'Абрамова В. В.' },
    { groupName: 'ЭК-321', weekday: 4, slot: 0, subjectName: 'Микроэкономика (продвинутый уровень)', kind: 'Практика', room: 'В-107', building: 'Корпус В', teacherName: 'Кузнецов А. В.' },
    { groupName: 'ЭК-321', weekday: 4, slot: 1, subjectName: 'Бухгалтерский учёт', kind: 'Практика', room: 'В-310', building: 'Корпус В', teacherName: 'Шевцова М. М.' },
    { groupName: 'ЭК-321', weekday: 4, slot: 2, subjectName: 'Статистика', kind: 'Лекция', room: 'В-204', building: 'Корпус В', teacherName: 'Абрамова В. В.' },
    { groupName: 'ЭК-321', weekday: 5, slot: 0, subjectName: 'Финансовая математика', kind: 'Практика', room: 'В-105', building: 'Корпус В', teacherName: 'Гуревич Л. М.' },
    { groupName: 'ЭК-321', weekday: 5, slot: 1, subjectName: 'Английский язык (деловой)', kind: 'Практика', room: 'Б-402', building: 'Корпус Б', teacherName: 'Соколова Н. Ю.' },
  ]
  for (const s of slots) {
    await prisma.scheduleSlot.create({
      data: {
        groupName: s.groupName, weekday: s.weekday, startMin: T[s.slot], endMin: T[s.slot] + 90,
        subjectName: s.subjectName, kind: s.kind, room: s.room, building: s.building,
        teacherName: s.teacherName,
      },
    })
  }
  console.log(`— Расписание: ${slots.length} пар в неделю`)

  // ── Переносы и отмены (динамично, на ближайшие дни) ──────────────────
  /**
   * Ближайшая будущая дата, когда у группы реально стоит этот предмет.
   * Нужно, чтобы демонстрация переноса/отмены была видна студенту:
   * изменение расписания применяется только к тому дню, где пара есть.
   */
  function nextDateWithSubject(groupName: string, subject: string, skip = 0): Date {
    const days = slots
      .filter((s) => s.groupName === groupName && s.subjectName.startsWith(subject))
      .map((s) => s.weekday)
    for (let i = 1; i <= 14; i++) {
      const d = addDays(today, i)
      if (!days.includes(wdOf(d))) continue
      if (skip > 0) {
        skip -= 1
        continue
      }
      return d
    }
    return addDays(today, 1)
  }
  const WD_RU = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
  const humanWd = (d: Date) => `${humanDate(d)}, ${WD_RU[wdOf(d) - 1]}`

  const bdFrom = nextDateWithSubject('ПИ-231', 'Базы данных')
  const bdTo = addDays(bdFrom, 1)
  const engDay = nextDateWithSubject('ПИ-231', 'Английский язык')
  const statDay = nextDateWithSubject('ЭК-321', 'Статистика')

  await prisma.scheduleChange.createMany({
    data: [
      {
        groupName: 'ПИ-231', date: isoDate(bdFrom), kind: 'MOVED',
        subject: 'Базы данных',
        message: `Лекция по базам данных (${humanWd(bdFrom)}, 09:00) перенесена на ${humanWd(bdTo)}, 12:40, ауд. Б-201.`,
        newDate: isoDate(bdTo), newStartMin: 760, newRoom: 'Б-201', authorName: 'Смирнова О. В.',
      },
      {
        groupName: 'ПИ-231', date: isoDate(engDay), kind: 'CANCELLED',
        subject: 'Английский язык',
        message: `Практика по английскому языку ${humanWd(engDay)} отменяется (методический день кафедры).`,
        authorName: 'Смирнова О. В.',
      },
      {
        groupName: 'ЭК-321', date: isoDate(statDay), kind: 'MOVED',
        subject: 'Статистика',
        message: `Лекция по статистике ${humanWd(statDay)} будет в ауд. В-306 (была В-204).`,
        newRoom: 'В-306', authorName: 'Смирнова О. В.',
      },
    ],
  })
  console.log('✓ Изменения расписания: 3 (перенос, отмена, замена аудитории — на реальные дни расписания)')

  // ── Оценки ───────────────────────────────────────────────────────────
  type Row = { kind: string; title: string; score?: number; maxScore?: number; mark?: string; d: Date; comment?: string }
  type GradeSeed = { login: string; subject: string; teacher: string; rows: Row[] }
  const grades: GradeSeed[] = [
    {
      login: 'student1', subject: 'Математический анализ', teacher: 'Демидова Е. П.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 38, maxScore: 50, d: dateAt(acYear, 9, 8) },
        { kind: 'Коллоквиум', title: 'Коллоквиум "Пределы и непрерывность"', mark: '5', score: 5, maxScore: 5, d: dateAt(acYear, 9, 24), comment: 'Отличный ответ у доски' },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 31, maxScore: 40, d: dateAt(acYear, 10, 28) },
      ],
    },
    {
      login: 'student1', subject: 'Алгоритмы и структуры данных', teacher: 'Мельник О. С.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 45, maxScore: 50, d: dateAt(acYear, 9, 10) },
        { kind: 'Контрольная работа', title: 'КР "Сортировки и куча"', mark: '5', score: 5, maxScore: 5, d: dateAt(acYear, 9, 26) },
        { kind: 'Лабораторные', title: 'Лаб. работа №3 "Хеш-таблицы"', mark: '5', score: 5, maxScore: 5, d: dateAt(acYear, 10, 15) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 34, maxScore: 40, d: dateAt(acYear, 10, 30) },
      ],
    },
    {
      login: 'student1', subject: 'Базы данных', teacher: 'Хайдаров Р. Р.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 44, maxScore: 50, d: dateAt(acYear, 9, 12) },
        { kind: 'Лабораторные', title: 'Лаб. работа №2 "SQL: JOIN и агрегаты"', mark: '5', score: 5, maxScore: 5, d: dateAt(acYear, 10, 8) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 29, maxScore: 40, d: dateAt(acYear, 10, 29) },
      ],
    },
    {
      login: 'student1', subject: 'Операционные системы', teacher: 'Титов С. С.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 39, maxScore: 50, d: dateAt(acYear, 9, 15) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 26, maxScore: 40, d: dateAt(acYear, 10, 27) },
      ],
    },
    {
      login: 'student1', subject: 'Веб-программирование', teacher: 'Полякова Д. А.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 47, maxScore: 50, d: dateAt(acYear, 9, 14) },
        { kind: 'Проект', title: 'Проект "Одностраничник команды"', mark: '5', score: 5, maxScore: 5, d: dateAt(acYear, 10, 12), comment: 'Лучший проект потока' },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 33, maxScore: 40, d: dateAt(acYear, 10, 31) },
      ],
    },
    {
      login: 'student1', subject: 'Английский язык', teacher: 'Барсукова Т. И.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 42, maxScore: 50, d: dateAt(acYear, 9, 18) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 30, maxScore: 40, d: dateAt(acYear, 10, 26) },
      ],
    },
    // student3 (Мария) — для рейтинга в группе
    {
      login: 'student3', subject: 'Математический анализ', teacher: 'Демидова Е. П.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 33, maxScore: 50, d: dateAt(acYear, 9, 8) },
        { kind: 'Коллоквиум', title: 'Коллоквиум "Пределы и непрерывность"', mark: '4', score: 4, maxScore: 5, d: dateAt(acYear, 9, 24) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 27, maxScore: 40, d: dateAt(acYear, 10, 28) },
      ],
    },
    {
      login: 'student3', subject: 'Алгоритмы и структуры данных', teacher: 'Мельник О. С.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 41, maxScore: 50, d: dateAt(acYear, 9, 10) },
        { kind: 'Контрольная работа', title: 'КР "Сортировки и куча"', mark: '4', score: 4, maxScore: 5, d: dateAt(acYear, 9, 26) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 30, maxScore: 40, d: dateAt(acYear, 10, 30) },
      ],
    },
    {
      login: 'student3', subject: 'Базы данных', teacher: 'Хайдаров Р. Р.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 46, maxScore: 50, d: dateAt(acYear, 9, 12) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 32, maxScore: 40, d: dateAt(acYear, 10, 29) },
      ],
    },
    {
      login: 'student3', subject: 'Операционные системы', teacher: 'Титов С. С.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 35, maxScore: 50, d: dateAt(acYear, 9, 15) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 24, maxScore: 40, d: dateAt(acYear, 10, 27) },
      ],
    },
    {
      login: 'student3', subject: 'Веб-программирование', teacher: 'Полякова Д. А.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 40, maxScore: 50, d: dateAt(acYear, 9, 14) },
        { kind: 'Проект', title: 'Проект "Одностраничник команды"', mark: '4', score: 4, maxScore: 5, d: dateAt(acYear, 10, 12) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 28, maxScore: 40, d: dateAt(acYear, 10, 31) },
      ],
    },
    {
      login: 'student3', subject: 'Английский язык', teacher: 'Барсукова Т. И.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 45, maxScore: 50, d: dateAt(acYear, 9, 18) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 33, maxScore: 40, d: dateAt(acYear, 10, 26) },
      ],
    },
    // student4 (Кирилл)
    {
      login: 'student4', subject: 'Математический анализ', teacher: 'Демидова Е. П.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 26, maxScore: 50, d: dateAt(acYear, 9, 8) },
        { kind: 'Коллоквиум', title: 'Коллоквиум "Пределы и непрерывность"', mark: '3', score: 3, maxScore: 5, d: dateAt(acYear, 9, 24) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 19, maxScore: 40, d: dateAt(acYear, 10, 28) },
      ],
    },
    {
      login: 'student4', subject: 'Алгоритмы и структуры данных', teacher: 'Мельник О. С.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 30, maxScore: 50, d: dateAt(acYear, 9, 10) },
        { kind: 'Контрольная работа', title: 'КР "Сортировки и куча"', mark: '3', score: 3, maxScore: 5, d: dateAt(acYear, 9, 26) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 21, maxScore: 40, d: dateAt(acYear, 10, 30) },
      ],
    },
    {
      login: 'student4', subject: 'Базы данных', teacher: 'Хайдаров Р. Р.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 34, maxScore: 50, d: dateAt(acYear, 9, 12) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 23, maxScore: 40, d: dateAt(acYear, 10, 29) },
      ],
    },
    {
      login: 'student4', subject: 'Операционные системы', teacher: 'Титов С. С.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 28, maxScore: 50, d: dateAt(acYear, 9, 15) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 18, maxScore: 40, d: dateAt(acYear, 10, 27) },
      ],
    },
    {
      login: 'student4', subject: 'Веб-программирование', teacher: 'Полякова Д. А.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 32, maxScore: 50, d: dateAt(acYear, 9, 14) },
        { kind: 'Проект', title: 'Проект "Одностраничник команды"', mark: '3', score: 3, maxScore: 5, d: dateAt(acYear, 10, 12) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 22, maxScore: 40, d: dateAt(acYear, 10, 31) },
      ],
    },
    {
      login: 'student4', subject: 'Английский язык', teacher: 'Барсукова Т. И.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 36, maxScore: 50, d: dateAt(acYear, 9, 18) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 25, maxScore: 40, d: dateAt(acYear, 10, 26) },
      ],
    },
    // student2 (Дмитрий, ЭК-321)
    {
      login: 'student2', subject: 'Эконометрика', teacher: 'Гуревич Л. М.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 40, maxScore: 50, d: dateAt(acYear, 9, 9) },
        { kind: 'Контрольная работа', title: 'КР "МНК и регрессия"', mark: '4', score: 4, maxScore: 5, d: dateAt(acYear, 9, 30) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 28, maxScore: 40, d: dateAt(acYear, 10, 28) },
      ],
    },
    {
      login: 'student2', subject: 'Микроэкономика (продвинутый уровень)', teacher: 'Кузнецов А. В.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 43, maxScore: 50, d: dateAt(acYear, 9, 11) },
        { kind: 'Эссе', title: 'Эссе "Теория игр на рынках"', mark: '5', score: 5, maxScore: 5, d: dateAt(acYear, 10, 3) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 31, maxScore: 40, d: dateAt(acYear, 10, 29) },
      ],
    },
    {
      login: 'student2', subject: 'Статистика', teacher: 'Абрамова В. В.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 37, maxScore: 50, d: dateAt(acYear, 9, 13) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 24, maxScore: 40, d: dateAt(acYear, 10, 30) },
      ],
    },
    {
      login: 'student2', subject: 'Бухгалтерский учёт', teacher: 'Шевцова М. М.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 35, maxScore: 50, d: dateAt(acYear, 9, 16) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 22, maxScore: 40, d: dateAt(acYear, 10, 27) },
      ],
    },
    {
      login: 'student2', subject: 'Финансовая математика', teacher: 'Гуревич Л. М.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 41, maxScore: 50, d: dateAt(acYear, 9, 17) },
        { kind: 'Контрольная работа', title: 'КР "Аннуитеты"', mark: '5', score: 5, maxScore: 5, d: dateAt(acYear, 10, 10) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 30, maxScore: 40, d: dateAt(acYear, 10, 28) },
      ],
    },
    {
      login: 'student2', subject: 'Английский язык (деловой)', teacher: 'Соколова Н. Ю.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 44, maxScore: 50, d: dateAt(acYear, 9, 19) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 32, maxScore: 40, d: dateAt(acYear, 10, 25) },
      ],
    },
    // student5 (Полина, ЭК-321)
    {
      login: 'student5', subject: 'Эконометрика', teacher: 'Гуревич Л. М.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 44, maxScore: 50, d: dateAt(acYear, 9, 9) },
        { kind: 'Контрольная работа', title: 'КР "МНК и регрессия"', mark: '5', score: 5, maxScore: 5, d: dateAt(acYear, 9, 30) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 33, maxScore: 40, d: dateAt(acYear, 10, 28) },
      ],
    },
    {
      login: 'student5', subject: 'Микроэкономика (продвинутый уровень)', teacher: 'Кузнецов А. В.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 42, maxScore: 50, d: dateAt(acYear, 9, 11) },
        { kind: 'Эссе', title: 'Эссе "Теория игр на рынках"', mark: '4', score: 4, maxScore: 5, d: dateAt(acYear, 10, 3) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 29, maxScore: 40, d: dateAt(acYear, 10, 29) },
      ],
    },
    {
      login: 'student5', subject: 'Статистика', teacher: 'Абрамова В. В.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 40, maxScore: 50, d: dateAt(acYear, 9, 13) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 27, maxScore: 40, d: dateAt(acYear, 10, 30) },
      ],
    },
    {
      login: 'student5', subject: 'Бухгалтерский учёт', teacher: 'Шевцова М. М.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 38, maxScore: 50, d: dateAt(acYear, 9, 16) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 26, maxScore: 40, d: dateAt(acYear, 10, 27) },
      ],
    },
    {
      login: 'student5', subject: 'Финансовая математика', teacher: 'Гуревич Л. М.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 45, maxScore: 50, d: dateAt(acYear, 9, 17) },
        { kind: 'Контрольная работа', title: 'КР "Аннуитеты"', mark: '5', score: 5, maxScore: 5, d: dateAt(acYear, 10, 10) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 35, maxScore: 40, d: dateAt(acYear, 10, 28) },
      ],
    },
    {
      login: 'student5', subject: 'Английский язык (деловой)', teacher: 'Соколова Н. Ю.', rows: [
        { kind: 'Модуль 1', title: 'Баллы за 1-й модуль', score: 41, maxScore: 50, d: dateAt(acYear, 9, 19) },
        { kind: 'Модуль 2', title: 'Баллы за 2-й модуль (текущие)', score: 30, maxScore: 40, d: dateAt(acYear, 10, 25) },
      ],
    },
  ]
  for (const g of grades) {
    for (const r of g.rows) {
      await prisma.grade.create({
        data: {
          userId: users[g.login], subjectName: g.subject, teacherName: g.teacher,
          kind: r.kind, title: r.title, score: r.score, maxScore: r.maxScore,
          mark: r.mark, date: r.d, comment: r.comment,
        },
      })
    }
  }
  console.log(`— Оценки: ${grades.reduce((a, g) => a + g.rows.length, 0)} записей`)

  // ── Сессия (январь следующего года) ──────────────────────────────────
  const J = (day: number) => isoDate(dateAt(sessionYear, 0, day))
  await prisma.examItem.createMany({
    data: [
      { groupName: 'ПИ-231', subjectName: 'Веб-программирование', kind: 'Зачёт', date: J(8), startMin: 760, room: '216 (КТ)', teacherName: 'Полякова Д. А.' },
      { groupName: 'ПИ-231', subjectName: 'Базы данных', kind: 'Зачёт', date: J(9), startMin: 760, room: '214 (КТ)', teacherName: 'Хайдаров Р. Р.' },
      { groupName: 'ПИ-231', subjectName: 'Английский язык', kind: 'Зачёт', date: J(10), startMin: 540, room: 'Б-418', teacherName: 'Барсукова Т. И.' },
      { groupName: 'ПИ-231', subjectName: 'Математический анализ', kind: 'Консультация', date: J(12), startMin: 640, room: 'А-312', teacherName: 'Демидова Е. П.' },
      { groupName: 'ПИ-231', subjectName: 'Математический анализ', kind: 'Экзамен', date: J(14), startMin: 540, room: 'А-312', teacherName: 'Демидова Е. П.' },
      { groupName: 'ПИ-231', subjectName: 'Алгоритмы и структуры данных', kind: 'Экзамен', date: J(17), startMin: 540, room: 'А-305', teacherName: 'Мельник О. С.' },
      { groupName: 'ПИ-231', subjectName: 'Операционные системы', kind: 'Экзамен', date: J(20), startMin: 640, room: 'А-310', teacherName: 'Титов С. С.' },
      { groupName: 'ЭК-321', subjectName: 'Английский язык (деловой)', kind: 'Зачёт', date: J(9), startMin: 640, room: 'Б-402', teacherName: 'Соколова Н. Ю.' },
      { groupName: 'ЭК-321', subjectName: 'Бухгалтерский учёт', kind: 'Зачёт', date: J(10), startMin: 760, room: 'В-308', teacherName: 'Шевцова М. М.' },
      { groupName: 'ЭК-321', subjectName: 'Финансовая математика', kind: 'Зачёт', date: J(11), startMin: 540, room: 'В-105', teacherName: 'Гуревич Л. М.' },
      { groupName: 'ЭК-321', subjectName: 'Эконометрика', kind: 'Экзамен', date: J(15), startMin: 540, room: 'В-101', teacherName: 'Гуревич Л. М.' },
      { groupName: 'ЭК-321', subjectName: 'Микроэкономика (продвинутый уровень)', kind: 'Экзамен', date: J(19), startMin: 540, room: 'В-101', teacherName: 'Кузнецов А. В.' },
      { groupName: 'ЭК-321', subjectName: 'Статистика', kind: 'Экзамен', date: J(22), startMin: 640, room: 'В-204', teacherName: 'Абрамова В. В.' },
    ],
  })
  console.log('✓ Сессия: 13 экзаменов и зачётов')

  // ── Типы заявок ──────────────────────────────────────────────────────
  const requestTypes = [
    { code: 'SPR_OB', title: 'Справка об обучении', description: 'Официальная справка о том, что вы учитесь в университете: курс, направление, форма обучения. Подходит по месту требования.', icon: 'file-check', processingDays: 2, sortOrder: 1 },
    { code: 'SPR_VYCHET', title: 'Справка для налогового вычета', description: 'Справка по форме для налогового вычета за обучение (для вас или родителей). Включает реквизиты лицензии.', icon: 'receipt', processingDays: 3, sortOrder: 2 },
    { code: 'SPR_STIP', title: 'Справка о стипендии', description: 'Справка о назначении и размере стипендии за указанные месяцы. Для банков, виз и соцвыплат.', icon: 'wallet', processingDays: 2, sortOrder: 3 },
    { code: 'SPR_VISA', title: 'Справка для визы / выезда', description: 'Справка на двух языках с периодом обучения и приглашением на сессию. Для оформления визы.', icon: 'plane', processingDays: 5, sortOrder: 4 },
    { code: 'ZAV_OTPUSK', title: 'Заявление на академический отпуск', description: 'Заявление с указанием причины и срока. Подтверждающие документы понадобятся в оригинале — их попросят в деканате.', icon: 'pause-circle', processingDays: 5, needsComment: true, sortOrder: 5 },
    { code: 'ZAV_PEREZACHET', title: 'Перезачёт дисциплин', description: 'Заявление о перезачёте дисциплин, пройденных в другом вузе или на другом направлении. Укажите дисциплины и вуз.', icon: 'arrow-left-right', processingDays: 7, needsComment: true, sortOrder: 6 },
  ]
  for (const t of requestTypes) {
    await prisma.requestType.create({ data: { ...t } })
  }
  console.log(`— Типы заявок: ${requestTypes.length}`)

  // ── Заявки ───────────────────────────────────────────────────────────
  async function makeRequest(opts: {
    login: string; number: string; typeCode: string; typeTitle: string; status: string;
    comment?: string; staffComment?: string; createdDaysAgo: number; dueInDays?: number;
    docCode?: string; history: { status: string; comment?: string; author: string; daysAgo: number }[]
  }) {
    const req = await prisma.serviceRequest.create({
      data: {
        number: opts.number, userId: users[opts.login], typeCode: opts.typeCode, typeTitle: opts.typeTitle,
        status: opts.status, comment: opts.comment, staffComment: opts.staffComment,
        dueDate: opts.dueInDays !== undefined ? addDays(today, opts.dueInDays) : null,
        readyAt: opts.status === 'READY' || opts.status === 'DONE' ? addDays(today, -(opts.history[opts.history.length - 1]?.daysAgo ?? 0)) : null,
        docCode: opts.docCode ?? null,
        createdAt: addDays(today, -opts.createdDaysAgo),
      },
    })
    for (const h of opts.history) {
      await prisma.requestEvent.create({
        data: {
          requestId: req.id, status: h.status, comment: h.comment, authorName: h.author,
          createdAt: addDays(today, -h.daysAgo),
        },
      })
    }
    return req
  }

  await makeRequest({
    login: 'student1', number: 'СП-2026-0118', typeCode: 'SPR_VYCHET', typeTitle: 'Справка для налогового вычета',
    status: 'READY', createdDaysAgo: 4, docCode: 'DEKA-7Q2K-11AF',
    history: [
      { status: 'NEW', author: 'Ковалёва А. С.', daysAgo: 4 },
      { status: 'IN_PROGRESS', author: 'Смирнова О. В.', daysAgo: 3, comment: 'Заявление принято в работу, проверяем данные лицензии.' },
      { status: 'READY', author: 'Смирнова О. В.', daysAgo: 1, comment: 'Справка готова. Можно получить в кабинете или по QR-коду.' },
    ],
  })
  await makeRequest({
    login: 'student1', number: 'СП-2026-0127', typeCode: 'SPR_OB', typeTitle: 'Справка об обучении',
    status: 'IN_PROGRESS', createdDaysAgo: 1, dueInDays: 1,
    history: [
      { status: 'NEW', author: 'Ковалёва А. С.', daysAgo: 1 },
      { status: 'IN_PROGRESS', author: 'Смирнова О. В.', daysAgo: 0, comment: 'Готовим справку, ожидайте уведомления.' },
    ],
  })
  await makeRequest({
    login: 'student1', number: 'СП-2026-0131', typeCode: 'SPR_STIP', typeTitle: 'Справка о стипендии',
    status: 'NEW', createdDaysAgo: 0, comment: 'Нужна за сентябрь–ноябрь, для банка.',
    history: [{ status: 'NEW', author: 'Ковалёва А. С.', daysAgo: 0 }],
  })
  await makeRequest({
    login: 'student2', number: 'ЭК-2026-0043', typeCode: 'ZAV_PEREZACHET', typeTitle: 'Перезачёт дисциплин',
    status: 'IN_PROGRESS', createdDaysAgo: 6, dueInDays: 1,
    comment: 'Прошёл "Теорию вероятностей" в колледже, программа совпадает. Приложил программу курса.',
    history: [
      { status: 'NEW', author: 'Соколов Д. А.', daysAgo: 6 },
      { status: 'IN_PROGRESS', author: 'Смирнова О. В.', daysAgo: 4, comment: 'Передано на кафедру финансов и учёта, ждём заключение.' },
    ],
  })
  await makeRequest({
    login: 'student2', number: 'ЭК-2026-0041', typeCode: 'SPR_OB', typeTitle: 'Справка об обучении',
    status: 'DONE', createdDaysAgo: 9, docCode: 'DEKA-3M8P-04C2',
    history: [
      { status: 'NEW', author: 'Соколов Д. А.', daysAgo: 9 },
      { status: 'IN_PROGRESS', author: 'Смирнова О. В.', daysAgo: 8 },
      { status: 'READY', author: 'Смирнова О. В.', daysAgo: 6 },
      { status: 'DONE', author: 'Смирнова О. В.', daysAgo: 5, comment: 'Выдана на руки.' },
    ],
  })
  await makeRequest({
    login: 'student3', number: 'СП-2026-0129', typeCode: 'SPR_OB', typeTitle: 'Справка об обучении',
    status: 'NEW', createdDaysAgo: 0,
    history: [{ status: 'NEW', author: 'Лебедева М. Д.', daysAgo: 0 }],
  })
  await makeRequest({
    login: 'student4', number: 'СП-2026-0124', typeCode: 'SPR_STIP', typeTitle: 'Справка о стипендии',
    status: 'IN_PROGRESS', createdDaysAgo: 2, dueInDays: 2,
    history: [
      { status: 'NEW', author: 'Ерёмин К. П.', daysAgo: 2 },
      { status: 'IN_PROGRESS', author: 'Смирнова О. В.', daysAgo: 1 },
    ],
  })
  await makeRequest({
    login: 'student5', number: 'СП-2026-0122', typeCode: 'SPR_OB', typeTitle: 'Справка об обучении',
    status: 'CANCELLED', createdDaysAgo: 5,
    comment: 'Нужна для отдела опеки.',
    history: [
      { status: 'NEW', author: 'Гусева П. И.', daysAgo: 5 },
      { status: 'IN_PROGRESS', author: 'Смирнова О. В.', daysAgo: 4, comment: 'Проверяем данные опекуна.' },
      { status: 'CANCELLED', author: 'Гусева П. И.', daysAgo: 3, comment: 'Заявка отменена студентом — справка не понадобилась.' },
    ],
  })
  console.log('✓ Заявки: 8 (с историей статусов, включая отменённую)')

  // ── Объявления ───────────────────────────────────────────────────────
  await prisma.announcement.createMany({
    data: [
      {
        title: 'Открыта запись на элективы весеннего семестра',
        body: 'Выберите элективы через личное заявление в разделе "Заявки" до 20 ноября. Кто не выберет — распределение автоматически по остатку мест.',
        category: 'ОБЩЕЕ', audience: 'ALL', authorName: 'Учебное управление',
        pinned: true, deadline: addDays(today, 16), createdAt: addDays(today, -1),
      },
      {
        title: 'Стипендия за ноябрь: сроки зачисления',
        body: 'Стипендия за ноябрь будет зачислена 25 ноября. Если выплата не пришла до 27 ноября — закажите справку о стипендии с комментарием, деканат проверит.',
        category: 'СТИПЕНДИЯ', audience: 'ALL', authorName: 'Смирнова О. В.',
        createdAt: addDays(today, -2),
      },
      {
        title: 'Перенос лекции по базам данных',
        body: 'Лекция по базам данных в четверг переносится на пятницу, 12:40, ауд. Б-201. В расписании всё уже обновлено.',
        category: 'РАСПИСАНИЕ', audience: 'GROUP:ПИ-231', authorName: 'Смирнова О. В.',
        createdAt: addDays(today, -1),
      },
      {
        title: 'Хакатон "Цифровой кампус" — набираем команды',
        body: '48 часов, 5 треков, призы от партнёров. Регистрация команд до конца недели. Участие засчитывается как практика по веб-программированию.',
        category: 'МЕРОПРИЯТИЕ', audience: 'ALL', authorName: 'Центр студенческих инициатив',
        deadline: addDays(today, 5), createdAt: addDays(today, -3),
      },
      {
        title: 'Порядок допуска к зимней сессии',
        body: 'К сессии допускаются студенты без академических задолженностей за модуль 2. Расписание экзаменов появится в разделе "Успеваемость" → "Сессия" в середине декабря.',
        category: 'СЕССИЯ', audience: 'ALL', authorName: 'Учебное управление',
        createdAt: addDays(today, -5),
      },
      {
        title: 'Встреча с кураторами факультета ЭМ',
        body: 'В пятницу в 16:00, ауд. В-101 — встреча кураторов со студентами 3 курса: вопросы практики, распределения по местам и профилям.',
        category: 'МЕРОПРИЯТИЕ', audience: 'GROUP:ЭК-321', authorName: 'Абрамова В. В.',
        createdAt: addDays(today, -2),
      },
      {
        title: 'График работы деканата в ноябре',
        body: 'Пн–Чт: 9:00–18:00, Пт: 9:00–16:45, обед 13:00–13:45. Электронные заявки обрабатываются в течение 1–2 рабочих дней.',
        category: 'ОБЩЕЕ', audience: 'ALL', authorName: 'Смирнова О. В.',
        pinned: true, createdAt: addDays(today, -8),
      },
    ],
  })
  console.log('✓ Объявления: 7')

  // ── Личные уведомления ───────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: users['student1'], kind: 'REQUEST_STATUS', title: 'Справка готова',
        body: 'Справка для налогового вычета (СП-2026-0118) готова. Покажите QR-код в деканате или заберите PDF.',
        link: '/requests', createdAt: addDays(today, -1),
      },
      {
        userId: users['student1'], kind: 'SCHEDULE', title: 'Расписание изменено',
        body: 'Лекция по базам данных в четверг перенесена на пятницу, 12:40, ауд. Б-201.',
        link: '/schedule', createdAt: addDays(today, -1),
      },
      {
        userId: users['student1'], kind: 'DEADLINE', title: 'До дедлайна 5 дней',
        body: 'Хакатон "Цифровой кампус": регистрация команд закрывается в конце недели.',
        link: '/notifications', createdAt: addDays(today, -3),
      },
      {
        userId: users['student1'], kind: 'REQUEST_STATUS', title: 'Заявка принята в работу',
        body: 'Справка об обучении (СП-2026-0127): деканат приступил к оформлению.',
        link: '/requests', createdAt: addDays(today, 0), readAt: addDays(today, 0),
      },
      {
        userId: users['student2'], kind: 'REQUEST_STATUS', title: 'Заявка передана на кафедру',
        body: 'Перезачёт дисциплин (ЭК-2026-0043): ждём заключение кафедры финансов и учёта.',
        link: '/requests', createdAt: addDays(today, -4),
      },
      {
        userId: users['student2'], kind: 'SCHEDULE', title: 'Изменение аудитории',
        body: 'Лекция по статистике перенесена в ауд. В-306 (была В-204).',
        link: '/schedule', createdAt: addDays(today, -2),
      },
      {
        userId: staff.id, kind: 'SYSTEM', title: 'Добро пожаловать в кабинет деканата',
        body: 'Здесь появляются новые заявки студентов. Обрабатывайте их и публикуйте объявления.',
        createdAt: addDays(today, -10),
      },
    ],
  })
  console.log('✓ Уведомления: 7')

  console.log('База наполнена. Тестовые аккаунты (пароль у всех demo1234):')
  console.log('   student1, student2, student3, student4, student5, dekanat')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
