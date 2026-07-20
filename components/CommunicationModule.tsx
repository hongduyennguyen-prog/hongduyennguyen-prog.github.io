"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Headphones, Lightbulb, MessageCircle, Mic, Play, RotateCcw, Search, Sparkles, Star, UserRound, Users, Volume2 } from "lucide-react";
import { communicationExtras } from "../data/communicationExtras";

type Branch = "classroom" | "basic";
type Role = "teacher" | "learner" | "both";
type Level = "starter" | "guided" | "reflex";
type Phrase = { en: string; vi: string };
type Topic = { id: string; branch: Branch; title: string; viTitle: string; icon: string; phrases: Phrase[] };
type Score = { listening: number; speaking: number; completed: boolean };
type Feedback = { score: number; message: string; heard?: string; correction: string };
type DialogueLine = Phrase & { speaker: "teacher" | "learner" };
type RecognitionLike = {
  lang: string; interimResults: boolean; continuous: boolean; start: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

const p = (en: string, vi: string): Phrase => ({ en, vi });
const topic = (id: string, branch: Branch, title: string, viTitle: string, icon: string, phrases: Phrase[]): Topic => ({ id, branch, title, viTitle, icon, phrases: [...phrases, ...(communicationExtras[id] || [])] });

const topics: Topic[] = [
  topic("c01", "classroom", "Greeting the class", "Chào lớp và bắt đầu tiết học", "👋", [p("Good morning, everyone.", "Chào buổi sáng cả lớp."), p("Please take your seats.", "Các em ngồi xuống nhé."), p("Are you ready to begin?", "Các em sẵn sàng bắt đầu chưa?"), p("Let’s start today’s lesson.", "Chúng ta bắt đầu bài học hôm nay."), p("I hope you are all doing well.", "Cô/thầy hy vọng các em đều khỏe.")]),
  topic("c02", "classroom", "Attendance", "Điểm danh", "✓", [p("Is everyone here today?", "Hôm nay cả lớp có mặt đầy đủ không?"), p("Who is absent today?", "Hôm nay ai vắng?"), p("Please say ‘here’ when I call your name.", "Hãy nói ‘có mặt’ khi cô/thầy gọi tên."), p("Has anyone seen Minh today?", "Hôm nay có ai gặp Minh không?"), p("Thank you. Attendance is complete.", "Cảm ơn các em. Chúng ta đã điểm danh xong.")]),
  topic("c03", "classroom", "Learning materials", "Kiểm tra đồ dùng học tập", "📚", [p("Please get your notebook ready.", "Hãy chuẩn bị vở."), p("Open your book to page twenty.", "Mở sách trang hai mươi."), p("Do you have a pencil and a ruler?", "Em có bút chì và thước không?"), p("Put your worksheet on the desk.", "Đặt phiếu bài tập lên bàn."), p("You may share a calculator with your partner.", "Em có thể dùng chung máy tính với bạn.")]),
  topic("c04", "classroom", "Getting attention", "Thu hút sự chú ý", "🔔", [p("Please look at the board.", "Hãy nhìn lên bảng."), p("Listen carefully to this example.", "Hãy nghe kỹ ví dụ này."), p("Eyes this way, please.", "Các em nhìn về phía này nhé."), p("Let’s focus for one more minute.", "Chúng ta tập trung thêm một phút nữa."), p("Please stop writing and listen.", "Hãy dừng viết và lắng nghe.")]),
  topic("c05", "classroom", "Introducing the lesson", "Giới thiệu bài học", "🎯", [p("Today we are going to learn about fractions.", "Hôm nay chúng ta sẽ học về phân số."), p("Our lesson is called ‘Linear Equations’.", "Bài học của chúng ta có tên là ‘Phương trình bậc nhất’."), p("By the end of the lesson, you can solve these problems.", "Cuối bài, các em có thể giải những bài toán này."), p("First, let’s review what we learned yesterday.", "Trước tiên, hãy ôn lại bài hôm qua."), p("This idea will help us with the next activity.", "Ý tưởng này sẽ giúp chúng ta làm hoạt động tiếp theo.")]),
  topic("c06", "classroom", "Giving instructions", "Hướng dẫn hoạt động", "➡️", [p("Read the question carefully.", "Hãy đọc kỹ câu hỏi."), p("Write your answer in the box.", "Viết câu trả lời vào ô."), p("Underline the important information.", "Gạch chân thông tin quan trọng."), p("Complete questions one to five.", "Hoàn thành câu một đến câu năm."), p("Show all your working.", "Trình bày đầy đủ các bước làm.")]),
  topic("c07", "classroom", "Checking understanding", "Kiểm tra mức độ hiểu", "💡", [p("Do you understand this step?", "Các em có hiểu bước này không?"), p("Which part is difficult?", "Phần nào khó?"), p("Can you explain the rule in your own words?", "Em có thể giải thích quy tắc bằng lời của mình không?"), p("Give me a thumbs-up if you are ready.", "Giơ ngón tay cái nếu em đã sẵn sàng."), p("Would you like another example?", "Các em có muốn xem thêm một ví dụ không?")]),
  topic("c08", "classroom", "Asking questions", "Đặt câu hỏi cho học sinh", "❓", [p("What is the answer?", "Đáp án là gì?"), p("How did you get this result?", "Em đã tìm được kết quả này như thế nào?"), p("Which operation should we use?", "Chúng ta nên dùng phép tính nào?"), p("Can anyone find another method?", "Có ai tìm được cách khác không?"), p("Why is this statement true?", "Tại sao mệnh đề này đúng?")]),
  topic("c09", "classroom", "Supporting answers", "Hướng dẫn học sinh trả lời", "💬", [p("Please answer in a complete sentence.", "Hãy trả lời bằng một câu đầy đủ."), p("Take your time and think.", "Hãy bình tĩnh suy nghĩ."), p("Use the key word in your answer.", "Hãy dùng từ khóa trong câu trả lời."), p("Explain your method to the class.", "Hãy giải thích cách làm của em cho cả lớp."), p("Can you give an example?", "Em có thể đưa ra một ví dụ không?")]),
  topic("c10", "classroom", "Pair and group work", "Làm việc theo cặp và nhóm", "👥", [p("Work with your partner.", "Hãy làm việc với bạn cùng cặp."), p("Discuss the question in groups of four.", "Thảo luận câu hỏi theo nhóm bốn người."), p("Compare your answers.", "Hãy so sánh câu trả lời."), p("Choose one person to present.", "Chọn một bạn để trình bày."), p("Make sure everyone has a turn.", "Hãy bảo đảm mỗi người đều có lượt.")]),
  topic("c11", "classroom", "Managing time", "Quản lý thời gian", "⏱️", [p("You have five minutes.", "Các em có năm phút."), p("There are two minutes left.", "Còn hai phút."), p("Please finish the last question.", "Hãy hoàn thành câu cuối."), p("Let’s check the answers now.", "Bây giờ chúng ta kiểm tra đáp án."), p("We will continue this activity tomorrow.", "Chúng ta sẽ tiếp tục hoạt động này vào ngày mai.")]),
  topic("c12", "classroom", "Praise and encouragement", "Khen ngợi và động viên", "⭐", [p("Good try.", "Em đã cố gắng tốt."), p("Your method is correct.", "Cách làm của em đúng."), p("That is a clear explanation.", "Đó là một lời giải thích rõ ràng."), p("You are making good progress.", "Em đang tiến bộ tốt."), p("Keep going. You are almost there.", "Tiếp tục nhé. Em gần làm được rồi.")]),
  topic("c13", "classroom", "Correcting mistakes", "Sửa lỗi nhẹ nhàng", "🛠️", [p("Check this step again.", "Hãy kiểm tra lại bước này."), p("The idea is right, but the calculation needs correction.", "Ý tưởng đúng nhưng phép tính cần sửa."), p("Look carefully at the sign.", "Hãy nhìn kỹ dấu phép tính."), p("Try the question one more time.", "Hãy thử làm lại câu này."), p("Let’s correct the answer together.", "Chúng ta cùng sửa đáp án.")]),
  topic("c14", "classroom", "Guiding a maths problem", "Hướng dẫn bài toán", "∑", [p("What information is given?", "Bài toán cho biết thông tin gì?"), p("What do we need to find?", "Chúng ta cần tìm gì?"), p("Choose the correct operation.", "Hãy chọn phép tính đúng."), p("Write the formula before substituting.", "Viết công thức trước khi thay số."), p("Remember to include the unit.", "Nhớ ghi đơn vị.")]),
  topic("c15", "classroom", "Explaining step by step", "Giải bài từng bước", "1·2·3", [p("First, identify what is given.", "Trước tiên, xác định dữ kiện đã cho."), p("Next, apply the formula.", "Tiếp theo, áp dụng công thức."), p("Then simplify the expression.", "Sau đó, rút gọn biểu thức."), p("Now calculate the final value.", "Bây giờ tính giá trị cuối cùng."), p("Finally, check your answer.", "Cuối cùng, kiểm tra đáp án.")]),
  topic("c16", "classroom", "Explaining again", "Giải thích lại khi học sinh chưa hiểu", "🔁", [p("Let me explain it in another way.", "Để cô/thầy giải thích theo cách khác."), p("Let’s use a simpler example.", "Chúng ta dùng một ví dụ đơn giản hơn."), p("Watch what happens in this step.", "Hãy quan sát điều xảy ra ở bước này."), p("I will say that again more slowly.", "Cô/thầy sẽ nói lại chậm hơn."), p("Which step should I explain again?", "Cô/thầy cần giải thích lại bước nào?")]),
  topic("c17", "classroom", "Changing activities", "Chuyển sang hoạt động mới", "↪️", [p("Now, let’s move to the next activity.", "Bây giờ chúng ta chuyển sang hoạt động tiếp theo."), p("Please close your books.", "Hãy đóng sách lại."), p("Put your pencils down.", "Hãy đặt bút xuống."), p("Turn to the person next to you.", "Hãy quay sang bạn bên cạnh."), p("We are going to practise together.", "Chúng ta sẽ cùng luyện tập.")]),
  topic("c18", "classroom", "Exit check and homework", "Cuối giờ và giao bài tập", "🏁", [p("Write one thing you learned today.", "Hãy viết một điều em học được hôm nay."), p("Show me your answer before you leave.", "Hãy cho cô/thầy xem đáp án trước khi ra về."), p("That’s all for today.", "Bài học hôm nay đến đây là hết."), p("Please complete exercise three at home.", "Hãy hoàn thành bài tập ba ở nhà."), p("See you in the next lesson.", "Hẹn gặp lại trong tiết học tiếp theo.")]),
  topic("c19", "classroom", "Technology and online class", "Thiết bị và lớp học trực tuyến", "💻", [p("Can everyone see my screen?", "Mọi người có nhìn thấy màn hình của cô/thầy không?"), p("Please turn on your microphone.", "Hãy bật micro."), p("I can’t hear you clearly.", "Cô/thầy không nghe rõ em."), p("Please type your answer in the chat.", "Hãy nhập câu trả lời vào khung trò chuyện."), p("Let me share the slide again.", "Để cô/thầy chia sẻ lại slide.")]),
  topic("c20", "classroom", "Permission and classroom needs", "Xin phép và nhu cầu trong lớp", "🙋", [p("May I come in?", "Em có thể vào lớp không ạ?"), p("Could I borrow a ruler?", "Em có thể mượn thước không ạ?"), p("May I ask a question?", "Em có thể hỏi một câu không ạ?"), p("Could you speak more slowly, please?", "Thầy/cô có thể nói chậm hơn không ạ?"), p("May I go to the board?", "Em có thể lên bảng không ạ?")]),
  topic("b01", "basic", "Greetings and introductions", "Chào hỏi và giới thiệu", "👋", [p("Hello. Nice to meet you.", "Xin chào. Rất vui được gặp bạn."), p("My name is Lan.", "Tên tôi là Lan."), p("What is your name?", "Bạn tên là gì?"), p("Where are you from?", "Bạn đến từ đâu?"), p("I’m from Vietnam.", "Tôi đến từ Việt Nam.")]),
  topic("b02", "basic", "School and work", "Trường học và công việc", "🎒", [p("I am a teacher.", "Tôi là giáo viên."), p("I work at a secondary school.", "Tôi làm việc tại một trường trung học."), p("What subject do you teach?", "Bạn dạy môn gì?"), p("I teach mathematics.", "Tôi dạy môn Toán."), p("My class starts at seven thirty.", "Lớp của tôi bắt đầu lúc bảy giờ ba mươi.")]),
  topic("b03", "basic", "Time and schedules", "Thời gian và lịch trình", "🕒", [p("What time is it?", "Bây giờ là mấy giờ?"), p("It is half past eight.", "Bây giờ là tám giờ rưỡi."), p("What time does the meeting start?", "Cuộc họp bắt đầu lúc mấy giờ?"), p("I am free on Friday afternoon.", "Tôi rảnh vào chiều thứ Sáu."), p("Let’s meet at nine o’clock.", "Chúng ta gặp nhau lúc chín giờ nhé.")]),
  topic("b04", "basic", "Daily routines", "Hoạt động hằng ngày", "☀️", [p("I get up at six o’clock.", "Tôi thức dậy lúc sáu giờ."), p("I usually have breakfast at home.", "Tôi thường ăn sáng ở nhà."), p("I go to school by bus.", "Tôi đi học bằng xe buýt."), p("I prepare my lessons in the evening.", "Tôi chuẩn bị bài vào buổi tối."), p("What do you do after work?", "Bạn làm gì sau giờ làm?")]),
  topic("b05", "basic", "Asking for help", "Xin giúp đỡ và cảm ơn", "🤝", [p("Could you help me, please?", "Bạn có thể giúp tôi được không?"), p("Can you show me how to do this?", "Bạn có thể chỉ tôi cách làm việc này không?"), p("Thank you for your help.", "Cảm ơn bạn đã giúp đỡ."), p("You’re welcome.", "Không có gì."), p("I really appreciate it.", "Tôi thực sự rất cảm kích.")]),
  topic("b06", "basic", "Asking for clarification", "Hỏi lại khi chưa nghe rõ", "👂", [p("Could you say that again, please?", "Bạn có thể nói lại được không?"), p("Could you speak more slowly?", "Bạn có thể nói chậm hơn không?"), p("What does this word mean?", "Từ này có nghĩa là gì?"), p("How do you spell that?", "Từ đó đánh vần như thế nào?"), p("I’m sorry, I don’t understand.", "Xin lỗi, tôi chưa hiểu.")]),
  topic("b07", "basic", "Directions and places", "Hỏi đường và địa điểm", "🧭", [p("Excuse me, where is the library?", "Xin lỗi, thư viện ở đâu?"), p("Go straight and turn left.", "Đi thẳng rồi rẽ trái."), p("It is next to the bank.", "Nó ở bên cạnh ngân hàng."), p("Is it far from here?", "Nó có xa đây không?"), p("Thank you for the directions.", "Cảm ơn bạn đã chỉ đường.")]),
  topic("b08", "basic", "Shopping", "Mua sắm và hỏi giá", "🛍️", [p("How much is this?", "Món này giá bao nhiêu?"), p("Do you have a smaller size?", "Bạn có cỡ nhỏ hơn không?"), p("I would like two of these.", "Tôi muốn mua hai món này."), p("Can I pay by card?", "Tôi có thể thanh toán bằng thẻ không?"), p("That’s all, thank you.", "Tôi mua vậy thôi, cảm ơn.")]),
  topic("b09", "basic", "Food and ordering", "Ăn uống và gọi món", "🍽️", [p("Could I see the menu, please?", "Cho tôi xem thực đơn được không?"), p("I would like a bowl of noodles.", "Tôi muốn một tô mì."), p("What do you recommend?", "Bạn đề xuất món nào?"), p("Could I have some water?", "Cho tôi xin một ít nước được không?"), p("The food is very good.", "Món ăn rất ngon.")]),
  topic("b10", "basic", "Everyday small talk", "Trò chuyện ngắn hằng ngày", "🌤️", [p("How is your day going?", "Hôm nay của bạn thế nào?"), p("The weather is nice today.", "Hôm nay thời tiết đẹp."), p("What do you like to do on weekends?", "Bạn thích làm gì vào cuối tuần?"), p("I enjoy reading and walking.", "Tôi thích đọc sách và đi bộ."), p("It was nice talking with you.", "Rất vui được trò chuyện với bạn.")])
];

function clean(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function sentenceScore(target: string, heard: string) {
  const targetWords = clean(target).split(" ").filter(Boolean);
  const heardWords = clean(heard).split(" ").filter(Boolean);
  if (!targetWords.length || !heardWords.length) return 0;
  return Math.round(targetWords.filter(word => heardWords.some(item => item === word || item.includes(word) || word.includes(item))).length / targetWords.length * 100);
}

const classroomReplies: Record<string, [Phrase, Phrase]> = {
  c01: [p("Good morning. We are ready.", "Chào buổi sáng. Chúng em đã sẵn sàng."), p("Yes, let’s begin.", "Vâng, chúng ta bắt đầu ạ.")],
  c02: [p("Everyone is here today.", "Hôm nay cả lớp có mặt đầy đủ ạ."), p("I am here.", "Em có mặt ạ.")],
  c03: [p("My notebook is ready.", "Vở của em đã sẵn sàng."), p("Yes, I have everything I need.", "Vâng, em có đủ đồ dùng cần thiết.")],
  c04: [p("I am looking at the board.", "Em đang nhìn lên bảng."), p("I can see the important step.", "Em đã thấy bước quan trọng.")],
  c05: [p("We are learning about fractions.", "Chúng em đang học về phân số."), p("I can solve a short example.", "Em có thể giải một ví dụ ngắn.")],
  c06: [p("I have read the question.", "Em đã đọc câu hỏi."), p("I will show every step.", "Em sẽ trình bày đầy đủ các bước.")],
  c07: [p("I understand the first step.", "Em hiểu bước đầu tiên."), p("Could I see another example?", "Em có thể xem thêm một ví dụ không ạ?")],
  c08: [p("The answer is twelve.", "Đáp án là mười hai."), p("I used multiplication.", "Em đã dùng phép nhân.")],
  c09: [p("I think the answer is correct.", "Em nghĩ đáp án là đúng."), p("I will explain my method.", "Em sẽ giải thích cách làm.")],
  c10: [p("I will work with my partner.", "Em sẽ làm việc cùng bạn."), p("We agree on the same answer.", "Chúng em thống nhất cùng một đáp án.")],
  c11: [p("I will start now.", "Em sẽ bắt đầu ngay."), p("I am checking my last answer.", "Em đang kiểm tra đáp án cuối.")],
  c12: [p("Thank you. I will keep trying.", "Em cảm ơn. Em sẽ tiếp tục cố gắng."), p("I checked my answer carefully.", "Em đã kiểm tra đáp án cẩn thận.")],
  c13: [p("I copied the sign incorrectly.", "Em đã chép sai dấu."), p("I can correct it now.", "Bây giờ em có thể sửa lại.")],
  c14: [p("The problem gives us the length and width.", "Bài toán cho chiều dài và chiều rộng."), p("We need to find the area.", "Chúng ta cần tìm diện tích.")],
  c15: [p("First, I will write the equation.", "Trước tiên, em sẽ viết phương trình."), p("Finally, I will substitute the value back.", "Cuối cùng, em sẽ thay giá trị trở lại.")],
  c16: [p("I do not understand the second step yet.", "Em chưa hiểu bước thứ hai."), p("The number line makes it clearer.", "Trục số giúp em hiểu rõ hơn.")],
  c17: [p("I have saved my work.", "Em đã lưu bài."), p("I am ready for the next task.", "Em đã sẵn sàng cho nhiệm vụ tiếp theo.")],
  c18: [p("I learned how to compare fractions.", "Em đã học cách so sánh phân số."), p("I have written down the homework.", "Em đã ghi bài tập về nhà.")],
  c19: [p("Yes, I can see your screen.", "Vâng, em nhìn thấy màn hình."), p("I will type my answer in the chat.", "Em sẽ nhập đáp án vào khung trò chuyện.")]
};

function dialogueFor(item: Topic): DialogueLine[] {
  if (item.id === "c20") return [
    { ...item.phrases[0], speaker: "learner" },
    { en: "Yes, you may come in.", vi: "Được, em có thể vào lớp.", speaker: "teacher" },
    { ...item.phrases[2], speaker: "learner" },
    { en: "Of course. What would you like to ask?", vi: "Được. Em muốn hỏi điều gì?", speaker: "teacher" }
  ];
  if (item.branch === "classroom") {
    const replies = classroomReplies[item.id] || [p("Yes, I understand.", "Vâng, em hiểu."), p("I will try it now.", "Em sẽ thử ngay.")];
    return [{ ...item.phrases[0], speaker: "teacher" }, { ...replies[0], speaker: "learner" }, { ...item.phrases[5], speaker: "teacher" }, { ...replies[1], speaker: "learner" }];
  }
  if (item.id === "b04") return [
    { ...item.phrases[4], speaker: "teacher" },
    { ...item.phrases[8], speaker: "learner" },
    { en: "What time do you usually get home?", vi: "Bạn thường về nhà lúc mấy giờ?", speaker: "teacher" },
    { ...item.phrases[7], speaker: "learner" }
  ];
  return item.phrases.slice(5, 9).map((line, index) => ({ ...line, speaker: item.id === "b07" ? index === 0 ? "teacher" : "learner" : index % 2 === 0 ? "teacher" : "learner" }));
}

function ResultCard({ feedback, retry, play }: { feedback: Feedback; retry: () => void; play: () => void }) {
  return <div className={`comm-result ${feedback.score >= 70 ? "good" : "retry"}`}><div><b>{feedback.score}%</b><span>{feedback.score >= 85 ? "Xuất sắc" : feedback.score >= 70 ? "Đạt" : "Cần luyện lại"}</span></div><section><p>{feedback.message}</p>{feedback.heard && <small>Hệ thống nghe được: “{feedback.heard}”</small>}<label><b>Câu đúng</b>{feedback.correction}</label><nav><button onClick={play}><Volume2 size={15}/> Nghe câu sửa</button><button onClick={retry}><RotateCcw size={15}/> Làm lại</button></nav></section></div>;
}

export default function CommunicationModule({ onSpeak }: { onSpeak: (text: string, rate?: number) => void }) {
  const [branch, setBranch] = useState<Branch>("classroom");
  const [selected, setSelected] = useState<Topic | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "learning" | "review" | "done">("all");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role>("teacher");
  const [level, setLevel] = useState<Level>("starter");
  const [stage, setStage] = useState(1);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [speed, setSpeed] = useState(.85);
  const [showTranscript, setShowTranscript] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [recording, setRecording] = useState(false);
  const [typed, setTyped] = useState("");
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [review, setReview] = useState<string[]>([]);
  const [roleScores, setRoleScores] = useState<Record<number, number>>({});

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mathspeak-communication") || "{}");
      if (saved.scores) setScores(saved.scores);
      if (Array.isArray(saved.review)) setReview(saved.review);
    } catch { /* Start with clean communication progress. */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("mathspeak-communication", JSON.stringify({ scores, review }));
  }, [scores, review]);

  const branchTopics = topics.filter(item => item.branch === branch);
  const filteredTopics = branchTopics.filter(item => {
    const score = scores[item.id];
    const statusMatches = filter === "all" || (filter === "new" && !score) || (filter === "learning" && score && !score.completed) || (filter === "done" && score?.completed) || (filter === "review" && review.some(key => key.startsWith(`${item.id}:`)));
    return statusMatches && `${item.title} ${item.viTitle}`.toLowerCase().includes(query.toLowerCase());
  });
  const current: Phrase = selected?.phrases[phraseIndex % (selected?.phrases.length || 1)] || { en: "Let’s practise this sentence.", vi: "Hãy luyện tập câu này." };
  const options = useMemo(() => {
    if (!selected) return [];
    const others = selected.phrases.filter(item => item.en !== current.en);
    const start = (phraseIndex * 3) % Math.max(1, others.length);
    return [current, others[start], others[(start + 3) % others.length]].filter(Boolean).sort((a, b) => (a.en.length + phraseIndex) % 7 - (b.en.length + phraseIndex) % 7);
  }, [selected, current, phraseIndex]);
  const dialogue = useMemo(() => selected ? dialogueFor(selected) : [], [selected]);
  const requiredRoleLines = useMemo(() => dialogue.map((line, index) => ({ line, index })).filter(({ line }) => role === "both" || line.speaker === role).map(({ index }) => index), [dialogue, role]);
  const reviewItems = review.flatMap(key => {
    const [topicId, rawIndex] = key.split(":");
    const item = topics.find(topicItem => topicItem.id === topicId);
    const index = Number(rawIndex);
    return item?.phrases[index] ? [{ topic: item, phrase: item.phrases[index], index }] : [];
  });
  const completedCount = branchTopics.filter(item => scores[item.id]?.completed).length;
  const branchScoreValues = branchTopics.map(item => scores[item.id]).filter((score): score is Score => Boolean(score));
  const averageListening = Math.round(branchScoreValues.reduce((sum, item) => sum + item.listening, 0) / Math.max(1, branchScoreValues.length));
  const averageSpeaking = Math.round(branchScoreValues.reduce((sum, item) => sum + item.speaking, 0) / Math.max(1, branchScoreValues.length));

  function openTopic(item: Topic) {
    setSelected(item); setStage(1); setPhraseIndex(0); setFeedback(null); setTyped(""); setShowTranscript(false); setRoleScores({});
  }

  function openReview(item: Topic, index: number) {
    setSelected(item); setStage(3); setPhraseIndex(index); setFeedback(null); setTyped(""); setShowTranscript(false); setRoleScores({});
  }

  function saveScore(kind: "listening" | "speaking", value: number, markComplete = false) {
    if (!selected) return;
    setScores(old => {
      const prior = old[selected.id] || { listening: 0, speaking: 0, completed: false };
      return { ...old, [selected.id]: { ...prior, [kind]: Math.max(prior[kind], value), completed: prior.completed || markComplete } };
    });
    const key = `${selected.id}:${phraseIndex}`;
    if (value < 70) setReview(old => old.includes(key) ? old : [...old, key]);
    else setReview(old => old.filter(item => item !== key));
  }

  function checkListening(answer: Phrase) {
    const score = answer.en === current.en ? 100 : 0;
    setFeedback({ score, correction: `${current.en} — ${current.vi}`, message: score ? "Bạn đã nghe đúng nội dung câu." : "Chưa đúng. Hãy nghe lại, chú ý từ khóa rồi thử thêm một lần." });
    saveScore("listening", score);
  }

  function checkTyped() {
    const score = sentenceScore(current.en, typed);
    setFeedback({ score, correction: current.en, message: score >= 85 ? "Câu trả lời chính xác và phù hợp tình huống." : score >= 60 ? "Ý chính đã đúng nhưng cần bổ sung hoặc sắp xếp lại một vài từ." : "Câu chưa khớp tình huống. Hãy xem câu đúng và làm lại." });
    saveScore("speaking", score);
  }

  function startRecording(target = current.en, complete = false, roleLineIndex?: number) {
    const w = window as typeof window & { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
    const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) {
      setFeedback({ score: 0, correction: target, message: "Thiết bị chưa hỗ trợ nhận diện giọng nói. Hãy dùng Chrome hoặc Edge và cấp quyền micro." });
      return;
    }
    const recognition = new Constructor();
    recognition.lang = "en-US"; recognition.interimResults = false; recognition.continuous = false;
    recognition.onresult = event => {
      const heard = event.results[0]?.[0]?.transcript || "";
      const score = sentenceScore(target, heard);
      const missing = clean(target).split(" ").filter(word => !clean(heard).includes(word));
      setFeedback({ score, heard, correction: target, message: score >= 85 ? "Phản xạ rõ ràng và đúng nội dung." : score >= 70 ? "Đã truyền đạt đúng ý. Hãy giữ nhịp nói tự nhiên hơn." : `Hãy nói chậm hơn và luyện lại${missing.length ? ` các từ: ${missing.slice(0, 4).join(", ")}` : " từng cụm"}.` });
      if (roleLineIndex === undefined) saveScore("speaking", score, complete && score >= 70);
      else {
        const nextRoleScores = { ...roleScores, [roleLineIndex]: Math.max(roleScores[roleLineIndex] || 0, score) };
        setRoleScores(nextRoleScores);
        const roleComplete = requiredRoleLines.length > 0 && requiredRoleLines.every(index => (nextRoleScores[index] || 0) >= 70);
        saveScore("speaking", score, roleComplete);
      }
    };
    recognition.onerror = () => setFeedback({ score: 0, correction: target, message: "Chưa nhận được âm thanh. Hãy kiểm tra quyền micro và thử lại." });
    recognition.onend = () => setRecording(false);
    setRecording(true); recognition.start();
  }

  function nextPhrase() {
    if (!selected) return;
    setPhraseIndex(index => (index + 1) % selected.phrases.length); setFeedback(null); setTyped(""); setShowTranscript(false);
  }

  if (!selected) return <div className="page-content comm-page">
    <section className="comm-hero"><div><span className="eyebrow"><MessageCircle size={15}/> SPEAKING + LISTENING</span><h1>Luyện giao tiếp tiếng Anh từ con số 0</h1><p>Chọn bất kỳ chủ đề nào. Tất cả bài học đều mở và có lộ trình gợi ý nếu bạn chưa biết bắt đầu từ đâu.</p></div><div className="comm-overview"><div><b>{averageListening}%</b><span>Listening</span></div><div><b>{averageSpeaking}%</b><span>Speaking</span></div><div><b>{review.length}</b><span>Câu cần ôn</span></div></div></section>
    <div className="comm-branches"><button className={branch === "classroom" ? "active" : ""} onClick={() => setBranch("classroom")}><span>🏫</span><div><small>20 CHỦ ĐỀ</small><b>Giao tiếp trong lớp học</b><p>Giáo viên, người học và hội thoại hai vai.</p></div><em>{topics.filter(item => item.branch === "classroom").filter(item => scores[item.id]?.completed).length}/20</em></button><button className={branch === "basic" ? "active" : ""} onClick={() => setBranch("basic")}><span>💬</span><div><small>10 CHỦ ĐỀ</small><b>Giao tiếp cơ bản</b><p>Tình huống thiết yếu trong cuộc sống hằng ngày.</p></div><em>{topics.filter(item => item.branch === "basic").filter(item => scores[item.id]?.completed).length}/10</em></button></div>
    <div className="comm-toolbar"><div className="comm-filters">{(["all", "new", "learning", "review", "done"] as const).map(item => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{({ all: "Tất cả", new: "Chưa học", learning: "Đang học", review: "Cần ôn", done: "Hoàn thành" })[item]}</button>)}</div><label><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm chủ đề..."/></label></div>
    <div className="comm-section-title"><div><span className="eyebrow"><Sparkles size={15}/> TỰ DO LỰA CHỌN</span><h2>{filter === "review" ? "Sổ ôn câu cần luyện lại" : branch === "classroom" ? "Giao tiếp trong lớp học" : "Giao tiếp cơ bản"}</h2></div><span>{filter === "review" ? `${reviewItems.filter(item => item.topic.branch === branch).length} câu` : `${completedCount}/${branchTopics.length} chủ đề hoàn thành`}</span></div>
    {filter === "review" && <div className="comm-review-book">{reviewItems.filter(item => item.topic.branch === branch).map(item => <article key={`${item.topic.id}:${item.index}`}><span>{item.topic.icon}</span><div><small>{item.topic.viTitle}</small><b>{item.phrase.en}</b><p>{item.phrase.vi}</p></div><button onClick={() => openReview(item.topic, item.index)}>Ôn câu này <ChevronRight size={16}/></button></article>)}{!reviewItems.some(item => item.topic.branch === branch) && <div className="comm-review-empty"><Check/><b>Chưa có câu nào cần ôn</b><span>Các câu dưới 70% sẽ tự động xuất hiện tại đây.</span></div>}</div>}
    {filter !== "review" && <div className="comm-topic-grid">{filteredTopics.map((item, index) => { const score = scores[item.id]; const needsReview = review.some(key => key.startsWith(`${item.id}:`)); return <button key={item.id} onClick={() => openTopic(item)}><div className="comm-topic-top"><span>{item.icon}</span>{index < 3 && !score && <small>GỢI Ý BẮT ĐẦU</small>}{score?.completed && <i><Check size={14}/></i>}</div><h3>{item.title}</h3><p>{item.viTitle}</p><div className="comm-topic-meta"><span><Headphones size={14}/> {score?.listening || 0}%</span><span><Mic size={14}/> {score?.speaking || 0}%</span>{needsReview && <b>Cần ôn</b>}</div><footer><span>{item.phrases.length} câu cốt lõi</span><ChevronRight size={17}/></footer></button>})}</div>}
  </div>;

  return <div className="page-content comm-lesson">
    <div className="comm-lesson-head"><button onClick={() => setSelected(null)}><ChevronLeft/> Chủ đề</button><div><small>{selected.branch === "classroom" ? "GIAO TIẾP LỚP HỌC" : "GIAO TIẾP CƠ BẢN"}</small><h2>{selected.title}</h2><p>{selected.viTitle}</p></div><span>{selected.icon}</span></div>
    <div className="comm-settings"><div><small>VAI LUYỆN TẬP</small>{(["teacher", "learner", "both"] as Role[]).map(item => <button key={item} className={role === item ? "active" : ""} onClick={() => { setRole(item); setRoleScores({}); setFeedback(null); }}>{item === "teacher" ? selected.branch === "classroom" ? "Giáo viên" : "Vai A" : item === "learner" ? selected.branch === "classroom" ? "Người học" : "Vai B" : "Hai vai"}</button>)}</div><div><small>MỨC ĐỘ</small>{(["starter", "guided", "reflex"] as Level[]).map(item => <button key={item} className={level === item ? "active" : ""} onClick={() => setLevel(item)}>{item === "starter" ? "Cơ bản" : item === "guided" ? "Có hướng dẫn" : "Phản xạ"}</button>)}</div></div>
    <div className="comm-stage-tabs">{["Nghe hiểu", "Nghe từng câu", "Shadowing", "Phản xạ", "Role-play"].map((label, index) => <button key={label} className={stage === index + 1 ? "active" : ""} onClick={() => { setStage(index + 1); setFeedback(null); }}><span>{index + 1}</span>{label}</button>)}</div>
    <section className="comm-practice-card">
      {stage === 1 && <><div className="comm-card-title"><Headphones/><div><small>BƯỚC 1 · LISTENING</small><h2>Nghe và chọn đúng ý</h2><p>Nghe trước khi xem phụ đề. Bạn có thể nghe lại tùy ý.</p></div></div><button className="comm-big-play" onClick={() => onSpeak(current.en, speed)}><Play fill="currentColor"/> Nghe câu</button><div className="speed-row"><span>Tốc độ</span>{[.7,.85,1].map(value => <button key={value} className={speed === value ? "active" : ""} onClick={() => setSpeed(value)}>{value}×</button>)}</div>{showTranscript && <div className="comm-transcript"><b>{current.en}</b><span>{current.vi}</span></div>}<button className="comm-text-button" onClick={() => setShowTranscript(value => !value)}>{showTranscript ? "Ẩn phụ đề" : "Xem phụ đề sau khi nghe"}</button><div className="listen-options">{options.map(option => <button key={option.en} onClick={() => checkListening(option)}>{option.vi}</button>)}</div>{feedback && <ResultCard feedback={feedback} retry={() => setFeedback(null)} play={() => onSpeak(current.en, .72)}/>} {feedback && <button className="primary comm-next" onClick={nextPhrase}>Câu tiếp theo <ChevronRight/></button>}</>}
      {stage === 2 && <><div className="comm-card-title"><BookOpen/><div><small>BƯỚC 2 · SENTENCE LIBRARY</small><h2>Nghe từng câu và xem nghĩa</h2><p>Chọn câu bạn muốn luyện. Phụ đề tiếng Việt nằm ngay bên dưới.</p></div></div><div className="comm-phrase-list">{selected.phrases.map((item, index) => <article className={phraseIndex === index ? "active" : ""} key={item.en} onClick={() => { setPhraseIndex(index); setFeedback(null); }}><span>{index + 1}</span><div><b>{item.en}</b><p>{item.vi}</p></div><button aria-label={`Nghe câu ${index + 1}`} onClick={event => { event.stopPropagation(); onSpeak(item.en, speed); }}><Volume2/></button></article>)}</div></>}
      {stage === 3 && <><div className="comm-card-title"><Mic/><div><small>BƯỚC 3 · SHADOWING</small><h2>Nghe và đọc theo</h2><p>Hệ thống chấm mức độ nhận diện nội dung, không chẩn đoán âm vị chuyên sâu.</p></div></div><div className="shadow-target"><small>CÂU {phraseIndex + 1}/{selected.phrases.length}</small>{level !== "reflex" && <h3>{current.en}</h3>}{level === "starter" && <p>{current.vi}</p>}{level === "guided" && <p>Gợi ý: {current.en.split(" ").slice(0,2).join(" ")}…</p>}<div><button onClick={() => onSpeak(current.en, .72)}><Volume2/> Nghe chậm</button><button className="primary" onClick={() => startRecording()} disabled={recording}><Mic/> {recording ? "Đang nghe…" : "Đọc theo"}</button></div></div>{feedback && <ResultCard feedback={feedback} retry={() => setFeedback(null)} play={() => onSpeak(feedback.correction, .72)}/>}<button className="primary comm-next" onClick={nextPhrase}>Câu tiếp theo <ChevronRight/></button></>}
      {stage === 4 && <><div className="comm-card-title"><Lightbulb/><div><small>BƯỚC 4 · GUIDED RESPONSE</small><h2>Phản xạ theo tình huống</h2><p>Viết hoặc nói câu tiếng Anh phù hợp với ý tiếng Việt.</p></div></div><div className="response-prompt"><small>HÃY NÓI</small><h3>{current.vi}</h3>{level === "starter" && <p>Câu mẫu: {current.en}</p>}{level === "guided" && <p>Gợi ý: {current.en.split(" ").slice(0,2).join(" ")}…</p>}<textarea value={typed} onChange={event => setTyped(event.target.value)} placeholder="Nhập câu tiếng Anh..."/><div><button onClick={checkTyped}><Check/> Chấm câu viết</button><button className="primary" onClick={() => startRecording()} disabled={recording}><Mic/> {recording ? "Đang nghe…" : "Trả lời bằng giọng nói"}</button></div></div>{feedback && <ResultCard feedback={feedback} retry={() => { setFeedback(null); setTyped(""); }} play={() => onSpeak(feedback.correction, .72)}/>}</>}
      {stage === 5 && <><div className="comm-card-title"><Users/><div><small>BƯỚC 5 · ROLE-PLAY</small><h2>Hội thoại 4 lượt theo vai</h2><p>Luyện các lượt được tô xanh. Chọn “Hai vai” để hoàn thành toàn bộ hội thoại.</p></div></div><div className="roleplay-dialogue">{dialogue.map((line, index) => { const isUserLine = role === "both" || line.speaker === role; const label = selected.branch === "classroom" ? line.speaker === "teacher" ? "Giáo viên" : "Người học" : line.speaker === "teacher" ? "Vai A" : "Vai B"; return <article className={isUserLine ? "user" : "model"} key={`${line.en}-${index}`}><header><span>{index + 1}</span><b>{isUserLine ? `Đến lượt bạn · ${label}` : label}</b>{roleScores[index] >= 70 && <i><Check size={14}/> Đạt {roleScores[index]}%</i>}</header>{level !== "reflex" || !isUserLine ? <p>{line.en}</p> : <p className="hidden-line">Nghe tình huống và phản xạ bằng tiếng Anh.</p>}{level === "starter" && <small>{line.vi}</small>}<footer><button onClick={() => onSpeak(line.en, .78)}><Volume2/> Nghe mẫu</button>{isUserLine && <button className="primary" onClick={() => startRecording(line.en, false, index)} disabled={recording}><Mic/> {recording ? "Đang nghe…" : "Luyện lượt này"}</button>}</footer></article>})}</div>{feedback && <ResultCard feedback={feedback} retry={() => setFeedback(null)} play={() => onSpeak(feedback.correction, .72)}/>}<div className="role-complete"><Star/><div><b>Tiến trình chủ đề</b><span>{requiredRoleLines.filter(index => (roleScores[index] || 0) >= 70).length}/{requiredRoleLines.length} lượt của vai đã đạt · Listening {scores[selected.id]?.listening || 0}% · Speaking {scores[selected.id]?.speaking || 0}%</span></div>{scores[selected.id]?.completed && <strong><Check/> Đã hoàn thành</strong>}</div></>}
    </section>
  </div>;
}
