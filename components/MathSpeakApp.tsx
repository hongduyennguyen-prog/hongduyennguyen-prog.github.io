"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award, BookOpen, Brain, Check, ChevronRight, CircleHelp, Download, FileText,
  Flame, GraduationCap, Headphones, Heart, Home, Layers3, Lightbulb, Lock,
  Mic, Play, Presentation, RotateCcw, Search, ShieldCheck, Sparkles, Star,
  UploadCloud, Volume2, WandSparkles, X, Zap, Users, UserPlus, Copy, Trash2, Link2, MessageCircle
} from "lucide-react";
import dictionaryJson from "@/data/dictionary.json";
import CommunicationModule from "@/components/CommunicationModule";

type Word = { id: string; index: number; term: string; ipa: string; pos: string; meaning: string; note?: string };
type Unit = { id: number; title: string; viTitle: string; words: Word[] };
type SpeechRecognitionLike = {
  lang: string; interimResults: boolean; continuous: boolean;
  start: () => void; stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

const dictionary = dictionaryJson as Unit[];
const totalWords = dictionary.reduce((sum, unit) => sum + unit.words.length, 0);
const WORDS_PER_TOPIC = 10;
const unitColors = ["#64748b", "#2563eb", "#0ea5e9", "#8b5cf6", "#f97316", "#14b8a6", "#10b981", "#06b6d4", "#7c3aed", "#ec4899", "#f59e0b", "#22c55e", "#fb7185"];
const unitIcons = ["∑", "ℕ", "+", "aⁿ", "ƒ", "∞", "△", "xy", "↻", "f′", "∫", "▥", "P"];

function studyDate() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function similarity(a: string, b: string) {
  const left = normalize(a).split(" ").filter(Boolean);
  const right = normalize(b).split(" ").filter(Boolean);
  if (!left.length || !right.length) return 0;
  const matches = left.filter(token => right.some(candidate => candidate === token || candidate.includes(token) || token.includes(candidate))).length;
  return matches / Math.max(left.length, right.length);
}

function classroomContext(word: Word) {
  const t = word.term.toLowerCase();
  const make = (first: string, second: string, vi: string) => ({ sentences: [first, second], vi });
  if (t === "digit") return make("Write the missing digit in the box.", "Which digit is in the tens place?", "Hãy viết chữ số còn thiếu vào ô trống.");
  if (/natural number|whole number|integer|rational number|irrational number|real number|complex number|prime number|composite number|perfect square/.test(t)) return make(`Classify this number as a ${word.term}.`, `Give one example of a ${word.term}.`, `Hãy phân loại xem số này có phải là ${word.meaning} hay không.`);
  if (t === "number" || /number line/.test(t)) return make("Mark this number on the number line.", "Which number comes immediately before it?", "Hãy đánh dấu số này trên trục số.");
  if (/fraction|mixed number/.test(t)) return make("Shade the fraction shown on the board.", "Write this mixed number as an improper fraction.", "Hãy tô màu phần biểu diễn phân số trên bảng.");
  if (/numerator/.test(t)) return make("Compare the numerators of these fractions.", "Write the numerator above the fraction bar.", "Hãy so sánh các tử số của những phân số này.");
  if (/denominator/.test(t)) return make("Find a common denominator for these fractions.", "Keep the denominator and add the numerators.", "Hãy tìm mẫu số chung của các phân số này.");
  if (/factor|greatest common factor/.test(t)) return make("List all the factors of twenty-four.", "Circle the greatest common factor.", "Hãy liệt kê tất cả các ước của hai mươi tư.");
  if (/multiple|least common multiple/.test(t)) return make("Write the first five multiples of six.", "Find the least common multiple of four and six.", "Hãy viết năm bội đầu tiên của số sáu.");
  if (/decimal|tenth|hundredth|thousandth/.test(t)) return make("Read this decimal aloud.", "Underline the digit in the hundredths place.", "Hãy đọc số thập phân này thành tiếng.");
  if (/round|approximate|approximation|estimate|estimation|error/.test(t)) return make("Round this number to the nearest hundred.", "Estimate the answer before calculating it exactly.", "Hãy làm tròn số này đến hàng trăm gần nhất.");
  if (/add|addition|plus|addend|sum/.test(t)) return make("Add these two numbers mentally.", "Find the sum and explain your strategy.", "Hãy nhẩm tổng của hai số này.");
  if (/subtract|subtraction|minus|minuend|subtrahend|difference/.test(t)) return make("Subtract the second number from the first.", "Find the difference and check by addition.", "Hãy lấy số thứ nhất trừ số thứ hai.");
  if (/multiply|multiplication|times|multiplicand|multiplier|product/.test(t)) return make("Multiply these numbers using the column method.", "Check the product with repeated addition.", "Hãy nhân các số này theo cách đặt tính.");
  if (/divide|division|dividend|divisor|quotient|remainder|divisible/.test(t)) return make("Divide eighteen by three.", "State the quotient and the remainder.", "Hãy lấy mười tám chia cho ba.");
  if (/ratio|proportion|proportional/.test(t)) return make("Simplify this ratio to its lowest terms.", "Use the proportion to find the missing value.", "Hãy rút gọn tỉ số này về dạng tối giản.");
  if (/percent|percentage/.test(t)) return make("Find twenty percent of fifty.", "Convert this percentage to a decimal.", "Hãy tìm hai mươi phần trăm của năm mươi.");
  if (/absolute value|modulus/.test(t)) return make("Find the absolute value of negative seven.", "Show the distance from zero on the number line.", "Hãy tìm giá trị tuyệt đối của âm bảy.");
  if (/radical|radicand|rationalize|square root/.test(t)) return make("Simplify this radical expression.", "Identify the radicand under the radical sign.", "Hãy rút gọn biểu thức căn thức này.");
  if (/exponent|power|exponentiation|scientific notation/.test(t) || (t === "base" && !word.id.startsWith("6-"))) return make("Write this product using an exponent.", "Identify the base and the exponent.", "Hãy viết tích này dưới dạng lũy thừa.");
  if (/logarithm|logarithmic|change of base|property of logarithms|natural base/.test(t)) return make("Rewrite this logarithm in exponential form.", "Apply the logarithm property to simplify the expression.", "Hãy viết lại lôgarit này dưới dạng lũy thừa.");
  if (/function/.test(t)) return make("Substitute the input into the function.", "Sketch the graph of this function.", "Hãy thay giá trị đầu vào vào hàm số.");
  if (/domain|range/.test(t)) return make(`Find the ${t} of this function.`, `Read the ${t} from the graph.`, `Hãy tìm ${word.meaning} của hàm số này.`);
  if (/variable|coefficient|parameter|constant|unknown/.test(t)) return make(`Identify the ${word.term} in this expression.`, `Explain what the ${word.term} represents.`, `Hãy xác định ${word.meaning} trong biểu thức này.`);
  if (/equation|equality|identity/.test(t)) return make("Solve this equation step by step.", "Check whether both sides are equal.", "Hãy giải phương trình này từng bước.");
  if (/inequality/.test(t)) return make("Solve the inequality and show the answer on a number line.", "Check one value from the solution set.", "Hãy giải bất phương trình và biểu diễn nghiệm trên trục số.");
  if (/expression|formula|monomial|binomial|trinomial|polynomial|like terms/.test(t)) return make("Simplify this algebraic expression.", `Identify the ${word.term} in the example.`, "Hãy rút gọn biểu thức đại số này.");
  if (/slope|intercept|asymptote|vertex|concav|point of inflection|axis of symmetry/.test(t)) return make(`Locate the ${word.term} on the graph.`, `Explain what the ${word.term} tells us about the graph.`, `Hãy xác định ${word.meaning} trên đồ thị.`);
  if (/coordinate|quadrant|origin|axis/.test(t)) return make("Plot this point on the coordinate plane.", `Label the ${word.term} clearly.`, "Hãy biểu diễn điểm này trên mặt phẳng tọa độ.");
  if (/sequence|progression|common difference|common ratio|general term|recursive|bound/.test(t)) return make("Write the next two terms of the sequence.", `Find the ${word.term} from the given terms.`, "Hãy viết hai số hạng tiếp theo của dãy số.");
  if (/chart|pictograph/.test(t)) return make(`Read the ${word.term} and compare the categories.`, "Which category has the highest value?", `Hãy đọc ${word.meaning} và so sánh các nhóm.`);
  if (/point|line|ray|segment|endpoint|midpoint|parallel|perpendicular|intersect|collinear|concurrent|skew/.test(t)) return make(`Draw and label the ${word.term}.`, `Find the ${word.term} in the diagram.`, `Hãy vẽ và ghi nhãn ${word.meaning}.`);
  if (/triangle|median|altitude|hypotenuse|bisector|centroid|orthocenter|circumcenter|incenter/.test(t)) return make(`Identify the ${word.term} in this triangle.`, `Draw the ${word.term} accurately.`, `Hãy xác định ${word.meaning} trong tam giác này.`);
  if (word.id.startsWith("6-") && /base|height|apex|edge|face|generatrix/.test(t)) return make(`Label the ${word.term} on this geometric figure.`, `Use the ${word.term} to calculate the required measure.`, `Hãy ghi nhãn ${word.meaning} trên hình này.`);
  if (/protractor|degree|radian/.test(t) || (t.includes("angle") && !t.includes("triangle"))) return make("Measure this angle with a protractor.", `Classify the ${word.term} in the diagram.`, "Hãy đo góc này bằng thước đo góc.");
  if (/quadrilateral|rectangle|square|parallelogram|rhombus|trapezoid|polygon|pentagon|hexagon|diagonal/.test(t)) return make(`Name the properties of this ${word.term}.`, `Draw one diagonal in the ${word.term}.`, `Hãy nêu các tính chất của ${word.meaning} này.`);
  if (/circle|radius|diameter|chord|arc|sector|tangent|secant|circumference/.test(t)) return make(`Mark the ${word.term} on the circle.`, `Use the diagram to calculate the ${word.term}.`, `Hãy đánh dấu ${word.meaning} trên đường tròn.`);
  if (/area|perimeter|surface|volume/.test(t)) return make(`Calculate the ${word.term} of this shape.`, "Write the correct unit with your answer.", `Hãy tính ${word.meaning} của hình này.`);
  if (/cube|cuboid|prism|pyramid|cylinder|sphere|cone|polyhedron|tetrahedron|frustum|parallelepiped/.test(t)) return make(`Identify the faces and edges of this ${word.term}.`, `Sketch a net for the ${word.term}.`, `Hãy xác định các mặt và cạnh của ${word.meaning} này.`);
  if (/vector|magnitude|direction|dot|scalar product|cross|head|tail/.test(t)) return make(`Draw the ${word.term} on the grid.`, `Calculate the ${word.term} using the coordinates.`, `Hãy biểu diễn ${word.meaning} trên lưới tọa độ.`);
  if (/ellipse|parabola|hyperbola|focus|eccentricity|directrix/.test(t)) return make(`Sketch the ${word.term} from its equation.`, `Mark the key features of the ${word.term}.`, `Hãy phác họa ${word.meaning} từ phương trình đã cho.`);
  if (/transform|translate|translation|reflect|reflection|rotate|rotation|dilat|homothety|projection|symmetry|scale factor|enlargement|contraction/.test(t)) return make(`Apply the ${word.term} to this shape.`, "Describe how every point moves.", `Hãy thực hiện phép ${word.meaning} đối với hình này.`);
  if (/sine|cosine|tangent|cotangent|secant|cosecant|law of/.test(t)) return make(`Use ${word.term} to find the missing side.`, "Choose the correct trigonometric ratio.", `Hãy dùng ${word.meaning} để tìm cạnh chưa biết.`);
  if (/limit|differentiat|derivative|product rule|quotient rule|chain rule|maximum|minimum|extremum/.test(t)) return make(`Find the ${word.term} of this function.`, "Show each differentiation step clearly.", `Hãy tìm ${word.meaning} của hàm số này.`);
  if (/integral|integrate|integration|antiderivative|integrand|area under/.test(t)) return make(`Evaluate this ${word.term}.`, "Check the result by differentiating it.", `Hãy tính ${word.meaning} này.`);
  if (/data|sample|frequency|mean|median|mode|quartile|variance|standard deviation|outlier|statistics/.test(t)) return make(`Calculate the ${word.term} for this data set.`, `Explain what the ${word.term} tells us about the data.`, `Hãy tính ${word.meaning} của bộ dữ liệu này.`);
  if (/probability|outcome|event|sample space|trial|permutation|combination/.test(t)) return make(`Find the ${word.term} for this experiment.`, "List all possible outcomes first.", `Hãy tìm ${word.meaning} của phép thử này.`);
  if (/set|element|subset|intersection|union|complement|venn|disjoint/.test(t)) return make(`Shade the ${word.term} on the Venn diagram.`, `List the elements in the ${word.term}.`, `Hãy tô phần ${word.meaning} trên biểu đồ Venn.`);
  if (/theorem|definition|postulate|proposition|corollary|proof|prove|contradict|condition|statement|negation|conjunction|disjunction|imply|converse/.test(t)) return make(`State the ${word.term} in your own words.`, "Use it to justify the next step of the proof.", `Hãy phát biểu ${word.meaning} bằng lời của em.`);
  if (/mathematics|mathematical|arithmetic|arithmetical|algebra|algebraic|geometry|geometric|trigonometry|trigonometric|calculus|analysis|analytic/.test(t)) return make(`Decide which part of ${word.term} is used in this problem.`, `Give one classroom example connected to ${word.term}.`, `Hãy xác định nội dung ${word.meaning} được sử dụng trong bài toán này.`);
  if (/antecedent|consequence/.test(t)) return make(`Identify the ${word.term} in this conditional statement.`, "Separate the hypothesis from the conclusion.", `Hãy xác định ${word.meaning} trong mệnh đề điều kiện này.`);
  if (t === "solution" && word.id.startsWith("0-")) return make("Present your solution in three clear steps.", "Check that every statement is justified.", "Hãy trình bày bài giải theo ba bước rõ ràng.");
  if (/belong|equivalent|negligible|finite|infinite/.test(t)) return make(`Decide whether “${word.term}” correctly describes this example.`, `Explain your decision using the definition of “${word.term}”.`, `Hãy quyết định “${word.term}” có mô tả đúng ví dụ này hay không.`);
  if (/calculate|calculation/.test(t)) return make("Calculate the answer and show your working.", "Check the calculation using a different method.", "Hãy tính kết quả và trình bày các bước làm.");
  if (/abbreviate|abbreviation/.test(t)) return make("Write the standard abbreviation for this mathematical unit.", "Read the abbreviation aloud in the full sentence.", "Hãy viết dạng viết tắt chuẩn của đơn vị Toán học này.");
  if (/straight edge|compass|set square/.test(t)) return make(`Use the ${word.term} to complete the construction.`, "Keep the construction lines visible.", `Hãy dùng ${word.meaning} để hoàn thành hình dựng.`);
  if (/roman numeral/.test(t)) return make("Write this number as a Roman numeral.", "Convert the Roman numeral back to a whole number.", "Hãy viết số này bằng chữ số La Mã.");
  if (/^unit$|^ten$|^hundred$|^thousand$/.test(t)) return make(`Identify the ${word.term} place in this number.`, "Write the value of the highlighted digit.", `Hãy xác định hàng ${word.meaning} trong số này.`);
  if (/^real$|imaginary|conjugate|cartesian form|polar form/.test(t)) return make(`Write the complex number in ${word.term}.`, "Mark its real and imaginary parts.", `Hãy viết số phức dưới ${word.meaning}.`);
  if (/operator/.test(t)) return make("Circle the operator in this expression.", "Tell the class which operation it represents.", "Hãy khoanh tròn ký hiệu phép tính trong biểu thức này.");
  if (/commutative|associative|distributive/.test(t)) return make(`Apply the ${word.term} property to rewrite the expression.`, "Explain why the value does not change.", `Hãy áp dụng tính chất ${word.meaning} để viết lại biểu thức.`);
  if (/continuity|continuous|discontinuous|discontinuity|monotonic/.test(t)) return make(`Use the graph to discuss ${word.term}.`, "Point to the interval where this property holds.", `Hãy dùng đồ thị để nhận xét về ${word.meaning}.`);
  if (t === "graph") return make("Sketch the graph on the coordinate plane.", "Label the intercepts and turning points.", "Hãy phác họa đồ thị trên mặt phẳng tọa độ.");
  if (t === "asymptotic") return make("Describe the asymptotic behavior of the graph.", "State which line the graph approaches.", "Hãy mô tả dáng điệu tiệm cận của đồ thị.");
  if (/^solve$|^root$/.test(t) || (t === "solution" && word.id.startsWith("4-"))) return make("Find every solution and check it in the original equation.", "State the roots clearly in the final line.", "Hãy tìm tất cả nghiệm và thử lại trong phương trình ban đầu.");
  if (/discriminant/.test(t)) return make("Calculate the discriminant of this quadratic equation.", "Use its sign to predict the number of real roots.", "Hãy tính biệt thức của phương trình bậc hai này.");
  if (/system of inequalities/.test(t)) return make("Solve each inequality and find the common region.", "Shade the solution of the system on the graph.", "Hãy giải từng bất phương trình và tìm miền nghiệm chung.");
  if (/substitution|elimination/.test(t)) return make(`Use ${word.term} to solve this system of equations.`, "Check the ordered pair in both equations.", `Hãy dùng ${word.meaning} để giải hệ phương trình này.`);
  if (t === "term") return make("Find the tenth term of the sequence.", "Explain how the terms change from one to the next.", "Hãy tìm số hạng thứ mười của dãy số.");
  if (/mathematical induction|qed/.test(t)) return make("Complete the proof by mathematical induction.", "Write QED after the final justified statement.", "Hãy hoàn thành chứng minh bằng quy nạp Toán học.");
  if (/plane geometry|solid geometry|geometer/.test(t) || (t === "geometry" && word.id.startsWith("6-"))) return make(`Classify this problem as an example of ${word.term}.`, "Name the geometric objects you can see.", `Hãy phân loại bài toán này theo nội dung ${word.meaning}.`);
  if (/coincide|normal|plane|planar|shape|side/.test(t)) return make(`Mark the ${word.term} clearly in the diagram.`, `Describe the relationship involving the ${word.term}.`, `Hãy đánh dấu ${word.meaning} rõ ràng trên hình.`);
  if (/circumscribe|inscribe|escribe/.test(t)) return make(`${word.term.charAt(0).toUpperCase() + word.term.slice(1)} the circle around the polygon.`, "Mark every point of contact.", `Hãy thực hiện phép ${word.meaning} và đánh dấu các tiếp điểm.`);
  if (t === "center") return make("Mark the center of the circle.", "Measure the distance from the center to the circumference.", "Hãy đánh dấu tâm của đường tròn.");
  if (/coplanar/.test(t)) return make("Decide whether these points are coplanar.", "Name the plane that contains them.", "Hãy xác định các điểm này có đồng phẳng hay không.");
  if (/^project$|^image$/.test(t)) return make(`Draw the ${word.term} of the point on the given plane.`, "Connect each original point to its image.", `Hãy vẽ ${word.meaning} của điểm trên mặt phẳng đã cho.`);
  if (/elliptical|parabolic|hyperbolic/.test(t)) return make(`Identify the ${word.term} curve from its equation.`, "Compare its shape with the other conic sections.", `Hãy nhận dạng đường có ${word.meaning} từ phương trình.`);
  if (/isometry|congruent|similar/.test(t)) return make(`Decide whether the two figures are ${word.term}.`, "State the matching sides and angles.", `Hãy xác định hai hình có ${word.meaning} hay không.`);
  if (/counterclockwise|clockwise/.test(t)) return make(`Rotate the figure ninety degrees ${word.term}.`, "Write the new coordinates of each vertex.", `Hãy quay hình chín mươi độ theo ${word.meaning}.`);
  if (/^period$|periodic|amplitude/.test(t)) return make(`Read the ${word.term} from this sinusoidal graph.`, "Explain how it changes the graph.", `Hãy đọc ${word.meaning} từ đồ thị hình sin này.`);
  if (/^minute$|^second$/.test(t)) return make(`Convert this angle measure into degrees, ${word.term}s, and seconds.`, "Check that sixty smaller units make one larger unit.", `Hãy đổi số đo góc sang độ, phút và giây.`);
  if (/differentiable|differential|increment|infinitesimal|numerical method/.test(t)) return make(`Identify ${word.term} in this calculus step.`, `Explain how ${word.term} affects the approximation.`, `Hãy xác định ${word.meaning} trong bước giải tích này.`);
  if (/infinitesimal term/.test(t)) return make("Identify the infinitesimal term in the integral.", "State the variable of integration.", "Hãy xác định thành phần vi phân trong tích phân.");
  if (/modal class/.test(t)) return make("Find the modal class in the frequency table.", "Explain why it contains the mode.", "Hãy tìm lớp chứa mốt trong bảng tần số.");
  const variants = [
    make(`Find “${word.term}” in the worked example.`, `Explain why “${word.term}” is needed in this step.`, `Hãy tìm “${word.term}” trong ví dụ đã giải.`),
    make(`Point to the part that represents “${word.term}”.`, `Describe “${word.term}” to your partner.`, `Hãy chỉ vào phần biểu diễn “${word.term}”.`),
    make(`Read the definition of “${word.term}” and give an example.`, `Compare “${word.term}” with the previous idea.`, `Hãy đọc định nghĩa của “${word.term}” và cho một ví dụ.`)
  ];
  return variants[word.index % variants.length];
}

function commandFor(word: Word) {
  return classroomContext(word).sentences[0];
}

function commandViFor(word: Word) {
  return classroomContext(word).vi;
}

function teachingSentences(word: Word, _index: number) {
  return classroomContext(word).sentences;
}

function syllableHint(word: string) {
  return word.split(/([aeiouy]+[^aeiouy\s]*)/i).filter(Boolean).join(" · ");
}

function preferredAmericanVoice(voices: SpeechSynthesisVoice[]) {
  const american = voices.filter(voice => voice.lang.replace("_", "-").toLowerCase().startsWith("en-us"));
  const preferredNames = ["samantha", "ava", "allison", "alex", "zoe", "susan", "tom", "google us english", "microsoft aria"];
  for (const name of preferredNames) {
    const match = american.find(voice => voice.name.toLowerCase().includes(name));
    if (match) return match;
  }
  return american.find(voice => voice.localService) || american[0] || voices.find(voice => voice.lang.toLowerCase().startsWith("en")) || null;
}

function speak(text: string, rate = 0.88) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    const voice = preferredAmericanVoice(synth.getVoices());
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice?.lang || "en-US";
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = 1;
    synth.speak(utterance);
  };
  if (synth.getVoices().length) start();
  else {
    synth.addEventListener("voiceschanged", start, { once: true });
    window.setTimeout(start, 350);
  }
}

function MathMark({ label, color }: { label: string; color: string }) {
  return <div className="math-mark" style={{ background: `${color}18`, color, borderColor: `${color}32` }}>{label}</div>;
}

function StatPill({ icon, value, label, tone }: { icon: React.ReactNode; value: string; label: string; tone: string }) {
  return <div className="stat-pill"><span style={{ color: tone }}>{icon}</span><b>{value}</b><small>{label}</small></div>;
}

export default function MathSpeakApp() {
  const [tab, setTab] = useState<"learn" | "communication" | "builder" | "class" | "qa">("learn");
  const [selectedUnit, setSelectedUnit] = useState(1);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [stage, setStage] = useState(1);
  const [topicIndex, setTopicIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const [hearts, setHearts] = useState(5);
  const [completed, setCompleted] = useState<string[]>([]);
  const [streak, setStreak] = useState(1);
  const [attempts, setAttempts] = useState(0);
  const [recording, setRecording] = useState(false);
  const [pronunciation, setPronunciation] = useState<{ score: number; message: string; correction?: string } | null>(null);
  const [spokenWords, setSpokenWords] = useState<string[]>([]);
  const [practiceFeedback, setPracticeFeedback] = useState<{ score: number; message: string; correction: string } | null>(null);
  const [showIpa, setShowIpa] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [practiceLevel, setPracticeLevel] = useState(1);
  const [built, setBuilt] = useState<string[]>([]);
  const [translation, setTranslation] = useState("");
  const touchX = useRef<number | null>(null);

  const unit = dictionary[selectedUnit];
  const topicCount = Math.ceil(unit.words.length / WORDS_PER_TOPIC);
  const topicWords = unit.words.slice(topicIndex * WORDS_PER_TOPIC, (topicIndex + 1) * WORDS_PER_TOPIC);
  const currentWord = topicWords[wordIndex % topicWords.length];
  const currentCommand = commandFor(currentWord);
  const tokens = useMemo(() => currentCommand.replace(/[.?!]/g, "").split(" ").sort((a, b) => b.localeCompare(a)), [currentCommand]);
  const progress = Math.round((completed.length / totalWords) * 100);
  const topicReady = topicWords.every(item => spokenWords.includes(item.id));

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mathspeak-progress") || "{}");
      if (Array.isArray(saved.completed)) setCompleted(saved.completed);
      if (typeof saved.hearts === "number") setHearts(saved.hearts);
      if (typeof saved.streak === "number") setStreak(saved.streak);
      const today = studyDate();
      if (saved.lastStudy && saved.lastStudy !== today) {
        const delta = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${saved.lastStudy}T00:00:00Z`)) / 86400000);
        setStreak(delta === 1 ? (saved.streak || 0) + 1 : 1);
      }
    } catch { /* Start with clean progress. */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("mathspeak-progress", JSON.stringify({ completed, hearts, streak, lastStudy: studyDate() }));
  }, [completed, hearts, streak]);

  function beginUnit(id: number) {
    setSelectedUnit(id); setTopicIndex(0); setWordIndex(0); setStage(1); setAttempts(0); setShowIpa(false); setShowHint(false); setSpokenWords([]); setPracticeFeedback(null); setSessionOpen(true);
  }

  function markWord(remembered: boolean) {
    if (!remembered) {
      speak(currentWord.term, .72);
      setAttempts(0); setShowIpa(false); setShowHint(false); setPronunciation(null); setPracticeFeedback(null); setBuilt([]); setTranslation(""); setStage(1);
      return;
    }
    if (!completed.includes(currentWord.id)) setCompleted(old => [...old, currentWord.id]);
    if (wordIndex < topicWords.length - 1) setWordIndex(index => index + 1);
    else { setWordIndex(0); setStage(2); }
    setAttempts(0); setShowIpa(false); setShowHint(false); setPronunciation(null); setPracticeFeedback(null); setBuilt([]); setTranslation("");
  }

  function selectTopic(index: number) {
    setTopicIndex(index); setWordIndex(0); setStage(1); setAttempts(0); setShowIpa(false); setShowHint(false); setPronunciation(null); setPracticeFeedback(null); setBuilt([]); setTranslation("");
  }

  function finishTopic() {
    if (topicIndex < topicCount - 1) selectTopic(topicIndex + 1);
    else setSessionOpen(false);
  }

  function practiceWord(index: number) {
    setWordIndex(index); setStage(3); setPracticeLevel(1); setBuilt([]); setTranslation(""); setPronunciation(null); setPracticeFeedback(null); setShowHint(false);
  }

  function checkPractice(level: number) {
    const response = level === 2 ? built.join(" ") : translation;
    const score = Math.round(similarity(currentCommand, response) * 100);
    const message = score >= 85 ? "Chính xác và tự nhiên. Bạn có thể chuyển sang cấp độ tiếp theo." : score >= 60 ? "Ý chính đã đúng, nhưng cần chỉnh lại thứ tự hoặc bổ sung một vài từ." : "Câu chưa khớp với tình huống. Hãy xem câu sửa rồi làm lại.";
    setPracticeFeedback({ score, message, correction: currentCommand });
  }

  function startRecognition(target = currentWord.term) {
    const w = window as typeof window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) {
      setPronunciation({ score: 0, message: "Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Hãy dùng Chrome hoặc Edge." });
      return;
    }
    const recognition = new Constructor();
    recognition.lang = "en-US"; recognition.interimResults = false; recognition.continuous = false;
    recognition.onresult = event => {
      const heard = event.results[0]?.[0]?.transcript || "";
      const score = Math.round(similarity(target, heard) * 100);
      if (target === currentWord.term && heard) setSpokenWords(old => old.includes(currentWord.id) ? old : [...old, currentWord.id]);
      if (score >= 70) setPronunciation({ score, message: `Rất tốt! Hệ thống nghe được: “${heard}”.`, correction: target });
      else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        if (nextAttempts >= 3) setShowIpa(true);
        if (nextAttempts < 3) setHearts(value => Math.max(0, value - 1));
        const missing = normalize(target).split(" ").filter(token => !normalize(heard).includes(token));
        setPronunciation({ score, message: `Hãy thử chậm hơn.${missing.length ? ` Cần đọc rõ hơn: ${missing.join(", ")}.` : ""} Hệ thống nghe được: “${heard || "…"}”.`, correction: target });
      }
    };
    recognition.onerror = () => setPronunciation({ score: 0, message: "Chưa nhận được âm thanh. Kiểm tra quyền micro và thử lại.", correction: target });
    recognition.onend = () => setRecording(false);
    setRecording(true); recognition.start();
  }

  function resetProgress() {
    if (!window.confirm("Bạn có chắc muốn xóa toàn bộ tiến trình từ vựng trên thiết bị này?")) return;
    setCompleted([]); setHearts(5); setStreak(1); localStorage.removeItem("mathspeak-progress");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => { setTab("learn"); setSessionOpen(false); }}>
          <span className="brand-logo">M<span>²</span></span><span><b>MathSpeak</b><small>English for Mathematics</small></span>
        </button>
        <nav>
          <button className={tab === "learn" ? "active" : ""} onClick={() => { setTab("learn"); setSessionOpen(false); }}><Home size={20} /> Học tập</button>
          <button className={tab === "communication" ? "active" : ""} onClick={() => { setTab("communication"); setSessionOpen(false); }}><MessageCircle size={20} /> Giao tiếp</button>
          <button className={tab === "builder" ? "active" : ""} onClick={() => { setTab("builder"); setSessionOpen(false); }}><Presentation size={20} /> Thiết kế bài giảng</button>
          <button title="Người tham gia" className={tab === "class" ? "active" : ""} onClick={() => { setTab("class"); setSessionOpen(false); }}><Users size={20} /> Người tham gia</button>
          <button className={tab === "qa" ? "active" : ""} onClick={() => { setTab("qa"); setSessionOpen(false); }}><ShieldCheck size={20} /> Trung tâm QA</button>
        </nav>
        <div className="sidebar-card">
          <div className="ring" style={{ "--progress": `${progress * 3.6}deg` } as React.CSSProperties}><span>{progress}%</span></div>
          <b>Hành trình 567 từ</b>
          <small>{completed.length} từ đã ghi nhớ</small>
        </div>
        <div className="sidebar-foot"><ShieldCheck size={16} /> Dữ liệu đã kiểm tra <span>v1.0</span></div>
      </aside>

      <main>
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-logo">M²</span><b>MathSpeak</b></div>
          <div className="top-stats">
            <StatPill icon={<Flame size={20} fill="currentColor" />} value={`${streak}`} label="ngày" tone="#f97316" />
            <StatPill icon={<Heart size={20} fill="currentColor" />} value={`${hearts}`} label="tim" tone="#fb3b68" />
            <StatPill icon={<Zap size={20} fill="currentColor" />} value={`${completed.length * 12}`} label="XP" tone="#f4b400" />
          </div>
          <div className="avatar">MS<span /></div>
        </header>
        <nav className="mobile-nav" aria-label="Điều hướng chính trên điện thoại">
          <button className={tab === "learn" ? "active" : ""} onClick={() => { setTab("learn"); setSessionOpen(false); }}><Home size={20}/><span>Học tập</span></button>
          <button className={tab === "communication" ? "active" : ""} onClick={() => { setTab("communication"); setSessionOpen(false); }}><MessageCircle size={20}/><span>Giao tiếp</span></button>
          <button className={tab === "builder" ? "active" : ""} onClick={() => { setTab("builder"); setSessionOpen(false); }}><Presentation size={20}/><span>Soạn bài</span></button>
          <button className={tab === "class" ? "active" : ""} onClick={() => { setTab("class"); setSessionOpen(false); }}><Users size={20}/><span>Tham gia</span></button>
          <button className={tab === "qa" ? "active" : ""} onClick={() => { setTab("qa"); setSessionOpen(false); }}><ShieldCheck size={20}/><span>QA</span></button>
        </nav>

        {tab === "learn" && !sessionOpen && <LearningDashboard completed={completed} onBegin={beginUnit} onReset={resetProgress} />}
        {tab === "learn" && sessionOpen && (
          <LearningSession
            unit={unit} word={currentWord} stage={stage} setStage={setStage} wordIndex={wordIndex}
            topicIndex={topicIndex} topicCount={topicCount} topicWords={topicWords} onSelectTopic={selectTopic}
            command={currentCommand} hearts={hearts} attempts={attempts} recording={recording}
            pronunciation={pronunciation} showIpa={showIpa} showHint={showHint} setShowHint={setShowHint}
            practiceLevel={practiceLevel} setPracticeLevel={setPracticeLevel} tokens={tokens} built={built} setBuilt={setBuilt}
            translation={translation} setTranslation={setTranslation} onClose={() => setSessionOpen(false)}
            onSpeak={speak} onRecord={startRecognition} onMark={markWord}
            topicReady={topicReady} spokenCount={topicWords.filter(item => spokenWords.includes(item.id)).length} practiceFeedback={practiceFeedback}
            onCheckPractice={checkPractice} onPracticeWord={practiceWord} onFinishTopic={finishTopic} onResetPractice={() => { setBuilt([]); setTranslation(""); setPronunciation(null); setPracticeFeedback(null); }}
            onTouchStart={x => touchX.current = x} onTouchEnd={x => { if (touchX.current !== null && Math.abs(x - touchX.current) > 60) markWord(x > touchX.current); touchX.current = null; }}
          />
        )}
        {tab === "communication" && <CommunicationModule onSpeak={speak} />}
        {tab === "builder" && <LessonBuilder onSpeak={speak} />}
        {tab === "class" && <ClassManager currentCompleted={completed.length} currentStreak={streak} />}
        {tab === "qa" && <QACenter />}
      </main>
    </div>
  );
}

function LearningDashboard({ completed, onBegin, onReset }: { completed: string[]; onBegin: (id: number) => void; onReset: () => void }) {
  const [query, setQuery] = useState("");
  const units = dictionary.slice(1).filter(unit => `${unit.title} ${unit.viTitle}`.toLowerCase().includes(query.toLowerCase()));
  const generalDone = dictionary[0].words.filter(word => completed.includes(word.id)).length;
  return <div className="page-content">
    <section className="hero">
      <div>
        <span className="eyebrow"><Sparkles size={15} /> LỘ TRÌNH CÁ NHÂN HÓA</span>
        <h1>Chào mừng đến với MathSpeak! <span>Ready to teach in English?</span></h1>
        <p>Mỗi ngày 10 từ • khoảng 15 phút luyện âm • Hoàn thành toàn bộ 567 từ trong khoảng 57 ngày.</p>
        <button className="primary" onClick={() => onBegin(1)}><Play size={18} fill="currentColor" /> Bắt đầu bài học hôm nay</button>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="orb one">a²+b²</div><div className="orb two">∫</div><div className="orb three">△</div>
        <div className="teacher-card"><span>EN</span><div><b>Teach maths.</b><small>Speak with confidence.</small></div></div>
      </div>
    </section>

    <section className="daily-grid">
      <div className="daily-card"><span className="icon-box blue"><BookOpen /></span><div><small>TỪ MỚI HÔM NAY</small><b>10 từ</b><span>Một chủ đề nhỏ mỗi lượt</span></div></div>
      <div className="daily-card"><span className="icon-box green"><Brain /></span><div><small>GỢI Ý ÔN TẬP</small><b>{Math.round(completed.length * .12)} từ</b><span>Ước lượng theo tiến trình trên máy</span></div></div>
      <div className="daily-card"><span className="icon-box orange"><Mic /></span><div><small>LUYỆN PHÁT ÂM</small><b>5 phút</b><span>Micro + phản hồi tức thì</span></div></div>
    </section>

    <section className="section-head">
      <div><span className="eyebrow"><Layers3 size={15} /> BẢN ĐỒ KIẾN THỨC</span><h2>12 Unit — Từ nền tảng đến chuyên sâu</h2><p>567 mục từ đã được chia nhỏ theo chủ đề để học đều và nhớ lâu.</p></div>
      <label className="search"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm Unit..." /></label>
    </section>

    <button className="foundation-strip" onClick={() => onBegin(0)}>
      <MathMark label="∑" color="#64748b" /><div><small>CHẶNG KHỞI ĐỘNG</small><b>Từ vựng Toán học tổng quát</b><span>{generalDone}/62 từ đã học</span></div><div className="mini-progress"><i style={{ width: `${generalDone / 62 * 100}%` }} /></div><ChevronRight />
    </button>

    <div className="unit-map">
      {units.map(unit => {
        const done = unit.words.filter(word => completed.includes(word.id)).length;
        const pct = Math.round(done / unit.words.length * 100);
        return <button key={unit.id} className="unit-card" onClick={() => onBegin(unit.id)}>
          <div className="unit-top"><MathMark label={unitIcons[unit.id]} color={unitColors[unit.id]} /><span className="unit-number">UNIT {String(unit.id).padStart(2, "0")}</span>{pct === 100 && <Check className="done-check" size={18} />}</div>
          <h3>{unit.title}</h3><p>{unit.viTitle}</p>
          <div className="unit-meta"><span>{unit.words.length} từ · {Math.ceil(unit.words.length / WORDS_PER_TOPIC)} chủ đề nhỏ</span><b>{pct}%</b></div>
          <div className="unit-progress"><i style={{ width: `${pct}%`, background: unitColors[unit.id] }} /></div>
          <span className="unit-action">{pct ? "Tiếp tục" : "Bắt đầu"} <ChevronRight size={16} /></span>
        </button>;
      })}
    </div>
    <div className="reset-row"><button className="text-button" onClick={onReset}><RotateCcw size={16} /> Đặt lại tiến trình bản thử nghiệm</button></div>
  </div>;
}

type SessionProps = {
  unit: Unit; word: Word; stage: number; setStage: (n: number) => void; wordIndex: number; command: string;
  topicIndex: number; topicCount: number; topicWords: Word[]; onSelectTopic: (index: number) => void;
  hearts: number; attempts: number; recording: boolean; pronunciation: { score: number; message: string; correction?: string } | null;
  showIpa: boolean; showHint: boolean; setShowHint: (v: boolean) => void; practiceLevel: number; setPracticeLevel: (v: number) => void;
  tokens: string[]; built: string[]; setBuilt: React.Dispatch<React.SetStateAction<string[]>>; translation: string; setTranslation: (v: string) => void;
  onClose: () => void; onSpeak: (text: string, rate?: number) => void; onRecord: (target?: string) => void; onMark: (remembered: boolean) => void;
  topicReady: boolean; spokenCount: number; practiceFeedback: { score: number; message: string; correction: string } | null;
  onCheckPractice: (level: number) => void; onPracticeWord: (index: number) => void; onFinishTopic: () => void; onResetPractice: () => void;
  onTouchStart: (x: number) => void; onTouchEnd: (x: number) => void;
};

function LearningSession(props: SessionProps) {
  const { unit, word, stage, setStage, wordIndex, topicIndex, topicCount, topicWords, onSelectTopic, command, hearts, attempts, recording, pronunciation, showIpa, showHint, setShowHint, practiceLevel, setPracticeLevel, tokens, built, setBuilt, translation, setTranslation, onClose, onSpeak, onRecord, onMark, topicReady, spokenCount, practiceFeedback, onCheckPractice, onPracticeWord, onFinishTopic, onResetPractice, onTouchStart, onTouchEnd } = props;
  return <div className="session-page">
    <div className="session-header"><button className="icon-button" onClick={onClose}><X /></button><div><small>UNIT {unit.id || "KHỞI ĐỘNG"} · CHỦ ĐỀ {topicIndex + 1}/{topicCount}</small><b>{unit.title}</b></div><div className="session-progress"><i style={{ width: `${((wordIndex + 1) / topicWords.length) * 100}%` }} /></div><span><Heart size={18} fill="currentColor" /> {hearts}</span></div>
    <div className="topic-strip" aria-label="Chọn chủ đề nhỏ">
      {Array.from({ length: topicCount }, (_, index) => {
        const start = index * WORDS_PER_TOPIC + 1;
        const end = Math.min((index + 1) * WORDS_PER_TOPIC, unit.words.length);
        return <button key={index} className={topicIndex === index ? "active" : ""} onClick={() => onSelectTopic(index)}><span>{index + 1}</span><b>Chủ đề {index + 1}</b><small>Từ {start}–{end}</small></button>;
      })}
    </div>
    <div className="stage-tabs">
      {["Nạp & phát âm", "Mẫu câu", "Thực hành", "Role-play"].map((label, i) => <button key={label} className={stage === i + 1 ? "active" : ""} disabled={i > 0 && !topicReady} onClick={() => topicReady && setStage(i + 1)} title={i > 0 && !topicReady ? "Hãy luyện nói đủ các từ trong chủ đề trước" : ""}><span>{i + 1}</span>{label}{i === 0 && <small>{spokenCount}/{topicWords.length}</small>}</button>)}
    </div>

    {stage === 1 && <section className="learning-stage">
      <div className="stage-copy"><span className="eyebrow"><Headphones size={15} /> CHỦ ĐỀ NHỎ {topicIndex + 1} · {spokenCount}/{topicWords.length} TỪ ĐÃ NÓI</span><h2>Nạp từ & chuẩn hóa phát âm</h2><p>Hãy nghe và nói đủ từng từ. Hoàn thành tối đa 10 từ để mở phần mẫu câu.</p></div>
      <div className="flashcard" onTouchStart={e => onTouchStart(e.touches[0].clientX)} onTouchEnd={e => onTouchEnd(e.changedTouches[0].clientX)}>
        <div className="word-count">{wordIndex + 1} / {topicWords.length}</div>
        <div className="word-symbol">{unitIcons[unit.id]}</div>
        <h3>{word.term}</h3><p className="ipa">/{word.ipa || "IPA đang cập nhật"}/ <button onClick={() => onSpeak(word.term)}><Volume2 size={20} /></button></p>
        <div className="meaning"><small>{word.pos || "TERM"}</small><b>{word.meaning}</b></div>
        {word.note && <div className="qa-note"><ShieldCheck size={16} /> {word.note}</div>}
        {(showIpa || attempts >= 3) && <div className="fallback"><Lightbulb size={18} /><div><b>Đọc chậm, không trừ thêm tim</b><span>/{word.ipa}/ · {syllableHint(word.term)}</span></div><button onClick={() => onSpeak(word.term, .62)}>Nghe chậm</button></div>}
        <div className={`wave ${recording ? "active" : ""}`}><i/><i/><i/><i/><i/><i/><i/></div>
        <button className={`record-button ${recording ? "recording" : ""}`} onClick={() => onRecord()}><Mic size={22} /> {recording ? "Đang nghe..." : "Đọc từ này"}</button>
        {pronunciation && <div className={`score-box ${pronunciation.score >= 70 ? "good" : "retry"}`}><b>{pronunciation.score}%</b><span>{pronunciation.message}{pronunciation.correction && <small>Cách đọc đúng: {pronunciation.correction}</small>}</span><button onClick={() => { onResetPractice(); onRecord(); }}><RotateCcw size={15}/> Làm lại</button></div>}
      </div>
      <div className="swipe-actions"><button onClick={() => onMark(false)}><RotateCcw /> Ôn lại từ này</button><span>{pronunciation ? "Đã ghi nhận lượt nói · có thể tiếp tục" : "Hãy bấm micro và nói trước khi qua từ mới"}</span><button className="remember" disabled={!pronunciation} onClick={() => onMark(true)}>{wordIndex === topicWords.length - 1 ? "Qua phần mẫu câu" : "Từ tiếp theo"} <ChevronRight /></button></div>
    </section>}

    {stage === 2 && <section className="learning-stage compact">
      <div className="stage-copy"><span className="eyebrow"><GraduationCap size={15} /> GIAI ĐOẠN 2 · {topicWords.length} TỪ</span><h2>Mẫu câu dạy học theo ngữ cảnh</h2><p>Mỗi từ có tình huống sử dụng riêng, tránh lặp lại một khuôn câu cho toàn bộ danh sách.</p></div>
      <div className="context-sentence-list">{topicWords.map((item, index) => <article key={item.id}><div className="context-term"><span>{index + 1}</span><div><b>{item.term}</b><small>{item.meaning}</small></div></div><div className="context-lines">{teachingSentences(item, index).map(sentence => <button key={sentence} onClick={() => onSpeak(sentence)}><Volume2 size={16}/><span>{sentence}</span></button>)}</div><button className="practice-this" onClick={() => onPracticeWord(index)}><Mic size={15}/> Thực hành với từ này</button></article>)}</div>
      <button className="primary next-stage" onClick={() => onPracticeWord(0)}>Bắt đầu thực hành đa cấp độ <ChevronRight size={18}/></button>
    </section>}

    {stage === 3 && <section className="learning-stage compact">
      <div className="stage-copy"><span className="eyebrow"><Zap size={15} /> GIAI ĐOẠN 3</span><h2>Thực hành đa cấp độ</h2><p>Đi từ bắt chước âm thanh đến tự hình thành câu nói.</p></div>
      <div className="practice-focus"><b>Từ đang luyện: {word.term}</b><span>{command}</span><button onClick={() => setStage(2)}>Đổi từ</button></div>
      <div className="level-tabs">{["Shadowing", "Xếp câu", "Dịch theo từ khóa"].map((label, i) => <button key={label} className={practiceLevel === i + 1 ? "active" : ""} onClick={() => { setPracticeLevel(i + 1); setShowHint(false); onResetPractice(); }}>{i + 1}. {label}</button>)}</div>
      <div className="practice-card">
        {practiceLevel === 1 && <><small>NGHE VÀ ĐỌC Y HỆT</small><h3>{command}</h3><button className="record-button" onClick={() => onRecord(command)}><Mic size={20}/> Shadowing ngay</button></>}
        {practiceLevel === 2 && <><small>SẮP XẾP THÀNH CÂU HOÀN CHỈNH</small><p className="vi-prompt">Gợi ý nghĩa: {commandViFor(word)}</p><div className="answer-zone">{built.length ? built.map((token, i) => <button key={`${token}-${i}`} onClick={() => setBuilt(old => old.filter((_, j) => j !== i))}>{token}</button>) : <span>Chạm các từ theo đúng thứ tự…</span>}</div><div className="token-bank">{tokens.filter((_, i) => !built.includes(tokens[i]) || built.filter(x => x === tokens[i]).length < tokens.slice(0, i + 1).filter(x => x === tokens[i]).length).map((token, i) => <button key={`${token}-${i}`} onClick={() => setBuilt(old => [...old, token])}>{token}</button>)}</div><button className="secondary check-practice" onClick={() => onCheckPractice(2)}><Check size={17}/> Chấm bài</button></>}
        {practiceLevel === 3 && <><small>DỊCH TÌNH HUỐNG</small><p className="vi-prompt">Hãy nói: “{commandViFor(word)}” Từ khóa: <b>{word.term}</b></p><textarea value={translation} onChange={e => setTranslation(e.target.value)} placeholder="Nhập câu tiếng Anh..."/><button className="secondary" onClick={() => onCheckPractice(3)}><Check size={17}/> Chấm bài</button></>}
        <button className="hint-button" onClick={() => setShowHint(!showHint)}><Lightbulb size={18}/> Xem gợi ý mẫu</button>
        {showHint && <div className="sample-hint"><div><b>Câu mẫu</b><p>{command}</p><span>Mẫu câu được chọn theo đúng ngữ cảnh của từ “{word.term}”.</span></div><button onClick={() => onSpeak(command)}><Volume2/></button></div>}
        {practiceLevel === 1 && pronunciation && <PracticeResult score={pronunciation.score} message={pronunciation.message} correction={pronunciation.correction || command} onRetry={onResetPractice} onSpeak={onSpeak}/>}
        {practiceLevel > 1 && practiceFeedback && <PracticeResult {...practiceFeedback} onRetry={onResetPractice} onSpeak={onSpeak}/>}
      </div>
      <button className="primary next-stage" onClick={() => { onResetPractice(); setStage(4); }}>Vào thử thách Role-play <ChevronRight size={18}/></button>
    </section>}

    {stage === 4 && <section className="learning-stage compact">
      <div className="stage-copy"><span className="eyebrow"><Award size={15} /> GIAI ĐOẠN 4</span><h2>Thử thách sư phạm</h2><p>Dùng tiếng Anh trong một tình huống lớp học sát thực tế.</p></div>
      <div className="role-card"><div className="role-scene"><div className="student-avatar">6A</div><div><small>TÌNH HUỐNG GIỜ RA CHƠI</small><p>Học sinh Dĩnh nhờ cô hướng dẫn lại phần trừ phân số vì liên tục mắc lỗi quy đồng.</p></div></div><div className="role-task"><b>Nhiệm vụ</b><p>Ghi âm một câu hướng dẫn ngắn bằng tiếng Anh.</p><button className="record-button" onClick={() => onRecord("First, find the common denominator. Then subtract the numerators.")}><Mic/> Ghi âm câu hướng dẫn</button></div><button className="hint-button" onClick={() => setShowHint(!showHint)}><Lightbulb/> Gợi ý mẫu</button>{showHint && <div className="dialogue"><p><b>Student:</b> I keep getting the denominator wrong.</p><p><b>Teacher:</b> First, find the common denominator. Then subtract the numerators.</p><p className="translation">Trước tiên, hãy tìm mẫu số chung. Sau đó trừ các tử số.</p><button onClick={() => onSpeak("First, find the common denominator. Then subtract the numerators.")}><Volume2/> Nghe hội thoại</button></div>}{pronunciation && <PracticeResult score={pronunciation.score} message={pronunciation.message} correction={pronunciation.correction || "First, find the common denominator. Then subtract the numerators."} onRetry={onResetPractice} onSpeak={onSpeak}/>}</div>
      <button className="primary next-stage" disabled={!pronunciation} onClick={onFinishTopic}><Star size={18}/> {topicIndex < topicCount - 1 ? "Hoàn thành và sang chủ đề tiếp" : "Hoàn thành Unit"}</button>
    </section>}
  </div>;
}

function PracticeResult({ score, message, correction, onRetry, onSpeak }: { score: number; message: string; correction: string; onRetry: () => void; onSpeak: (text: string, rate?: number) => void }) {
  return <div className={`practice-result ${score >= 70 ? "good" : "retry"}`}><div className="practice-percent"><b>{score}%</b><span>{score >= 85 ? "Xuất sắc" : score >= 70 ? "Đạt" : "Cần luyện lại"}</span></div><div><p>{message}</p><div className="practice-correction"><b>Câu đúng</b><span>{correction}</span><button onClick={() => onSpeak(correction, .78)}><Volume2 size={15}/> Nghe sửa lỗi</button></div><button className="retry-practice" onClick={onRetry}><RotateCcw size={15}/> Làm lại bài này</button></div></div>;
}

type WorksheetItem = {
  type: "Multiple choice" | "Fill in the blank" | "True / False" | "Short answer" | "Matching" | "Extended response";
  prompt: string;
  options?: string[];
  answer: string;
  answerVi: string;
  points: number;
};

function shortMeaning(word: Word) {
  return word.meaning.split(/[,;(]/)[0].trim();
}

function fileLessonTitle(text: string, fileName: string) {
  const candidate = text.split(/[\r\n]+/).map(line => line.replace(/\s+/g, " ").trim()).find(line => line.length >= 5 && line.length <= 110);
  return candidate || fileName.replace(/\.(pdf|docx|txt)$/i, "").replace(/[_-]+/g, " ");
}

function fileExamples(text: string) {
  return text.split(/(?<=[.!?])\s+|[\r\n]+/).map(part => part.replace(/\s+/g, " ").trim()).filter(part => part.length >= 15 && part.length <= 220 && /\d|[=+\-×÷/%]/.test(part)).slice(0, 3);
}

function conceptLine(word: Word) {
  const term = word.term.toLowerCase();
  if (term.includes("fraction")) return "A fraction represents equal parts of a whole. The top number is the numerator and the bottom number is the denominator.";
  if (term.includes("denominator")) return "The denominator tells us how many equal parts make one whole.";
  if (term.includes("numerator")) return "The numerator tells us how many equal parts we are considering.";
  if (term.includes("equation")) return "An equation states that two mathematical expressions have the same value.";
  if (term.includes("triangle")) return "A triangle is a polygon with three sides and three angles.";
  if (term.includes("probability")) return "Probability describes how likely an event is to happen, from impossible to certain.";
  if (term.includes("function")) return "A function assigns exactly one output to each valid input.";
  return `“${word.term}” is one of the central ideas in this lesson. We use it to describe and explain the mathematical process clearly.`;
}

function conceptLineVi(word: Word) {
  const term = word.term.toLowerCase();
  if (term.includes("fraction")) return "Phân số biểu diễn các phần bằng nhau của một tổng thể. Số ở trên là tử số và số ở dưới là mẫu số.";
  if (term.includes("denominator")) return "Mẫu số cho biết một đơn vị được chia thành bao nhiêu phần bằng nhau.";
  if (term.includes("numerator")) return "Tử số cho biết chúng ta đang xét bao nhiêu phần bằng nhau.";
  if (term.includes("equation")) return "Phương trình cho biết hai biểu thức Toán học có cùng giá trị.";
  if (term.includes("triangle")) return "Tam giác là một đa giác có ba cạnh và ba góc.";
  if (term.includes("probability")) return "Xác suất mô tả khả năng một sự kiện có thể xảy ra, từ không thể đến chắc chắn.";
  if (term.includes("function")) return "Hàm số gán đúng một giá trị đầu ra cho mỗi giá trị đầu vào hợp lệ.";
  return `“${word.term}” là một ý chính của bài học. Ta dùng thuật ngữ này để mô tả và giải thích quá trình Toán học một cách rõ ràng.`;
}

function guidedExample(words: Word[]) {
  const terms = words.map(word => word.term.toLowerCase()).join(" ");
  if (/fraction|denominator|numerator/.test(terms)) return {
    line: "Example: Add three eighths and two eighths. The denominators are the same, so keep eight and add the numerators: three plus two equals five. Therefore, three eighths plus two eighths equals five eighths.",
    vi: "Ví dụ: Cộng ba phần tám với hai phần tám. Hai mẫu số giống nhau nên giữ nguyên mẫu số tám và cộng các tử số: ba cộng hai bằng năm. Vậy ba phần tám cộng hai phần tám bằng năm phần tám."
  };
  if (/equation|variable|unknown/.test(terms)) return {
    line: "Example: Solve x plus three equals seven. Subtract three from both sides. Seven minus three equals four, so x equals four. Check: four plus three equals seven.",
    vi: "Ví dụ: Giải phương trình x cộng ba bằng bảy. Trừ ba ở cả hai vế. Bảy trừ ba bằng bốn nên x bằng bốn. Kiểm tra: bốn cộng ba bằng bảy."
  };
  if (/triangle|angle|geometry/.test(terms)) return {
    line: "Example: A triangle has angles of fifty degrees and sixty degrees. The angles total one hundred and eighty degrees, so the third angle is one hundred and eighty minus one hundred and ten, which equals seventy degrees.",
    vi: "Ví dụ: Một tam giác có hai góc bằng năm mươi độ và sáu mươi độ. Tổng ba góc là một trăm tám mươi độ nên góc thứ ba bằng một trăm tám mươi trừ một trăm mười, bằng bảy mươi độ."
  };
  if (/percent|percentage/.test(terms)) return {
    line: "Example: Find twenty percent of fifty. Convert twenty percent to zero point two, then multiply zero point two by fifty. The answer is ten.",
    vi: "Ví dụ: Tìm hai mươi phần trăm của năm mươi. Đổi hai mươi phần trăm thành số thập phân không phẩy hai, rồi nhân không phẩy hai với năm mươi. Kết quả bằng mười."
  };
  return {
    line: "Example: Divide eighteen by three. We can make three equal groups. Each group has six, so eighteen divided by three equals six. Let’s check: six times three equals eighteen.",
    vi: "Ví dụ: Chia mười tám cho ba. Ta có thể chia thành ba nhóm bằng nhau. Mỗi nhóm có sáu nên mười tám chia ba bằng sáu. Kiểm tra: sáu nhân ba bằng mười tám."
  };
}

function lessonScript(words: Word[], title: string, examples: string[]) {
  const focus = words.slice(0, 4);
  const vocabulary = focus.slice(0, 3);
  const example = guidedExample(focus);
  return [
    { phase: "1 · Greeting", line: "Good morning, class. How are you today?", vi: "Chào buổi sáng cả lớp. Hôm nay các em thế nào?" },
    { phase: "2 · Start the lesson", line: "Please sit down, get your notebook ready, and look at the board. Let’s begin our mathematics lesson.", vi: "Các em ngồi xuống, chuẩn bị vở và nhìn lên bảng nhé. Chúng ta bắt đầu tiết Toán." },
    { phase: "3 · Introduce the lesson", line: `Today’s lesson is “${title}”. By the end of the lesson, you will be able to use the key ideas and explain your answer in English.`, vi: `Bài học hôm nay là “${title}”. Cuối bài, các em sẽ có thể vận dụng kiến thức chính và trình bày câu trả lời bằng tiếng Anh.` },
    ...vocabulary.map((word, index) => ({ phase: `${index + 4} · New vocabulary`, line: `Our ${["first", "second", "third"][index]} new word is “${word.term}”. In Vietnamese, it means “${shortMeaning(word)}”. Listen: ${word.term}. Now repeat after me: ${word.term}.`, vi: `Từ mới thứ ${["nhất", "hai", "ba"][index]} là “${word.term}”, có nghĩa là “${shortMeaning(word)}”. Hãy nghe cô/thầy đọc: ${word.term}. Bây giờ các em đọc lại: ${word.term}.` })),
    { phase: "7 · Core concept", line: focus[0] ? conceptLine(focus[0]) : "Let us identify the main mathematical idea in this lesson.", vi: focus[0] ? conceptLineVi(focus[0]) : "Chúng ta hãy xác định ý Toán học chính trong bài học này." },
    { phase: "8 · Core concept", line: focus[1] ? conceptLine(focus[1]) : "Now connect this idea to the information in the problem.", vi: focus[1] ? conceptLineVi(focus[1]) : "Bây giờ hãy liên hệ ý này với các dữ kiện trong bài toán." },
    { phase: "9 · Example from the file", line: examples.length ? "The uploaded lesson includes a worked example. First, identify what is given. Next, choose the correct rule. Then solve step by step and check the answer." : "Let us study a worked example. Identify the data, choose a rule, solve step by step, and check the answer.", vi: examples.length ? "Bài học đã tải lên có một ví dụ minh họa. Trước tiên, xác định dữ kiện đã cho. Tiếp theo, chọn quy tắc phù hợp. Sau đó giải từng bước và kiểm tra đáp án." : "Chúng ta cùng xem một ví dụ. Hãy xác định dữ kiện, chọn quy tắc, giải từng bước và kiểm tra đáp án." },
    { phase: "10 · Guided simple exercise", line: example.line, vi: example.vi },
    { phase: "11 · Mini practice", line: focus[2] ? `Now it is your turn. Complete one short task and use the word “${focus[2].term}” when you explain your answer.` : "Now it is your turn. Complete the short task and explain your answer in English.", vi: focus[2] ? `Bây giờ đến lượt các em. Hãy hoàn thành một bài tập ngắn và sử dụng từ “${focus[2].term}” khi trình bày đáp án.` : "Bây giờ đến lượt các em. Hãy hoàn thành bài tập ngắn và trình bày câu trả lời bằng tiếng Anh." },
    { phase: "12 · Review", line: `Before we finish, tell your partner one thing you learned about “${focus[0]?.term || "today’s lesson"}”. Thank you for your hard work.`, vi: `Trước khi kết thúc, hãy nói với bạn bên cạnh một điều em đã học về “${focus[0]?.term || "bài học hôm nay"}”. Cảm ơn các em đã học tập chăm chỉ.` },
  ];
}

function buildWorksheet(words: Word[]): WorksheetItem[] {
  const allWords = dictionary.flatMap(unit => unit.words);
  const focus = words.length ? words : allWords.slice(10, 16);
  const pick = (index: number) => focus[index % focus.length];
  const target = pick(0);
  const distractors = allWords.filter(word => !focus.some(item => item.id === word.id)).slice(0, 3).map(word => word.term);
  return [
    { type: "Multiple choice", prompt: "Which mathematical term is a focus of the uploaded lesson?", options: [target.term, ...distractors], answer: `A. ${target.term}`, answerVi: `Đáp án A: ${target.term}.`, points: 200 },
    { type: "Fill in the blank", prompt: `Complete the classroom instruction: “Use ______ in the solution.”`, answer: pick(1).term, answerVi: `Điền từ: ${pick(1).term} (${shortMeaning(pick(1))}).`, points: 200 },
    { type: "True / False", prompt: `The term “${pick(2).term}” appears in the uploaded lesson.`, answer: "True", answerVi: `Đúng. Thuật ngữ “${pick(2).term}” xuất hiện trong nội dung bài học.`, points: 200 },
    { type: "Matching", prompt: `Match each term to its lesson meaning: ${focus.slice(0, 3).map((word, index) => `${String.fromCharCode(65 + index)}. ${word.term}`).join("; ")}.`, answer: focus.slice(0, 3).map((word, index) => `${String.fromCharCode(65 + index)} — ${shortMeaning(word)}`).join("; "), answerVi: focus.slice(0, 3).map((word, index) => `${String.fromCharCode(65 + index)} — ${shortMeaning(word)}`).join("; "), points: 200 },
    { type: "Short answer", prompt: `Explain “${pick(3).term}” in your own words and give one mathematical example.`, answer: `Accept an accurate definition of ${pick(3).term} and one relevant mathematical example.`, answerVi: `Chấp nhận câu trả lời nêu đúng nghĩa của “${pick(3).term}” (${shortMeaning(pick(3))}) và có một ví dụ Toán học phù hợp.`, points: 200 },
    { type: "Extended response", prompt: `Create and solve a short problem connected to “${pick(4).term}”. Show every step and use the English term in your explanation.`, answer: `Answers may vary. Award full credit for a valid problem, correct working, a correct result, and accurate use of “${pick(4).term}”.`, answerVi: `Câu trả lời có thể khác nhau. Cho đủ điểm khi bài toán hợp lệ, các bước làm đúng, kết quả đúng và dùng chính xác thuật ngữ “${pick(4).term}”.`, points: 200 },
  ];
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return value.replace(/[&<>"']/g, character => entities[character] || character);
}

type LessonSlide = { kind: string; title: string; body: string; term?: Word; sourceExample?: string; visual?: string };

function buildLessonSlides(words: Word[], title: string, examples: string[]): LessonSlide[] {
  const focus = words.slice(0, 4);
  return [
    { kind: "Welcome", title: "Good morning, class!", body: "Get your notebook ready and look at the board. Let’s begin our mathematics lesson.", visual: "👋" },
    { kind: "Lesson title", title, body: "Today we will learn key mathematics vocabulary, understand the main ideas, and explain our answers in English.", visual: "📘" },
    ...focus.slice(0, 3).map(word => ({ kind: "Vocabulary & pronunciation", title: word.term, body: `/${word.ipa || "IPA"}/ · Vietnamese meaning: ${shortMeaning(word)}`, term: word, visual: "🔊" })),
    { kind: "Core concept", title: focus[0]?.term || "Key concept", body: focus[0] ? conceptLine(focus[0]) : "Identify the first key idea in the lesson.", term: focus[0], visual: "∑" },
    { kind: "Core concept", title: focus[1]?.term || "Connect the ideas", body: focus[1] ? conceptLine(focus[1]) : "Connect the key idea to the information in the problem.", term: focus[1], visual: "→" },
    { kind: "Worked example from file", title: "Let’s solve it together", body: examples[0] || "Identify what is given, choose the correct rule, solve step by step, and check the answer.", sourceExample: examples[0], visual: "✏️" },
    { kind: "Mini practice", title: "Your turn", body: focus[2] ? `Use “${focus[2].term}” to solve or explain one short problem.` : "Solve one short problem and explain your answer." },
    { kind: "Exit ticket", title: "Check your understanding", body: "Use one English mathematics term to explain what you learned today." },
  ];
}

function LessonBuilder({ onSpeak }: { onSpeak: (text: string) => void }) {
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<"idle" | "reading" | "ready" | "error">("idle");
  const [workflowStep, setWorkflowStep] = useState(1);
  const [sourceWords, setSourceWords] = useState<Word[]>(dictionary[1].words.slice(0, 6));
  const [sourceLength, setSourceLength] = useState(0);
  const [sourceImage, setSourceImage] = useState("");
  const [lessonTitle, setLessonTitle] = useState("Mathematics Lesson");
  const [sourceExamples, setSourceExamples] = useState<string[]>([]);
  const [worksheetView, setWorksheetView] = useState<"student" | "answers-en" | "answers-vi">("student");
  const [mockSlide, setMockSlide] = useState(0);
  const [coachRecording, setCoachRecording] = useState(false);
  const [coachTarget, setCoachTarget] = useState("");
  const [coachResult, setCoachResult] = useState<{ score: number; transcript: string; missed: string[]; feedback: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const script = useMemo(() => lessonScript(sourceWords, lessonTitle, sourceExamples), [sourceWords, lessonTitle, sourceExamples]);
  const commands = useMemo(() => script.map(step => step.line), [script]);
  const slides = useMemo(() => buildLessonSlides(sourceWords, lessonTitle, sourceExamples), [sourceWords, lessonTitle, sourceExamples]);
  const questions = useMemo(() => buildWorksheet(sourceWords), [sourceWords]);

  async function readFile(file: File) {
    setFileName(file.name); setStatus("reading"); setWorkflowStep(1); setSourceImage(""); setCoachResult(null);
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("File is larger than 20 MB");
      let text = "";
      if (/\.docx$/i.test(file.name)) {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        text = result.value;
      } else if (/\.pdf$/i.test(file.name)) {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const coverPage = await pdf.getPage(1);
        const viewport = coverPage.getViewport({ scale: 1.15 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width; canvas.height = viewport.height;
        const context = canvas.getContext("2d");
        if (context) {
          await coverPage.render({ canvas, canvasContext: context, viewport }).promise;
          setSourceImage(canvas.toDataURL("image/jpeg", .82));
        }
        for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
          const page = await pdf.getPage(i); const content = await page.getTextContent();
          text += " " + content.items.map(item => "str" in item ? item.str : "").join(" ");
        }
      } else text = await file.text();
      const allWords = dictionary.flatMap(unit => unit.words);
      const normalizedText = text.toLowerCase().replace(/\s+/g, " ");
      const matches = allWords.filter(word => {
        const meaning = shortMeaning(word).toLowerCase();
        return normalizedText.includes(word.term.toLowerCase()) || (meaning.length > 2 && normalizedText.includes(meaning));
      }).slice(0, 10);
      setSourceWords(matches.length ? matches : allWords.slice(10, 16));
      setLessonTitle(fileLessonTitle(text, file.name));
      setSourceExamples(fileExamples(text));
      setSourceLength(text.trim().length);
      setMockSlide(0);
      setWorksheetView("student");
      setStatus("ready");
    } catch { setStatus("error"); }
  }

  function startCoach(target: string) {
    const w = window as typeof window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    setCoachTarget(target); setCoachResult(null);
    if (!Constructor) {
      setCoachResult({ score: 0, transcript: "", missed: [], feedback: "Thiết bị này chưa hỗ trợ nhận diện giọng nói. Hãy dùng Chrome hoặc Edge và cho phép micro." });
      return;
    }
    const recognition = new Constructor();
    recognition.lang = "en-US"; recognition.interimResults = false; recognition.continuous = false;
    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      const score = Math.round(similarity(target, transcript) * 100);
      const heard = normalize(transcript);
      const missed = sourceWords.filter(word => !heard.includes(normalize(word.term))).slice(0, 5).map(word => word.term);
      const feedback = score >= 80 ? "Diễn đạt rõ và bám sát kịch bản. Hãy tiếp tục giữ nhịp nói tự nhiên." : score >= 55 ? "Nội dung cơ bản đã đúng. Hãy nói chậm hơn và nhấn rõ các thuật ngữ Toán học." : "Hãy nghe câu mẫu, chia câu thành cụm ngắn rồi luyện lại từng cụm.";
      setCoachResult({ score, transcript, missed, feedback });
    };
    recognition.onerror = () => setCoachResult({ score: 0, transcript: "", missed: [], feedback: "Chưa nhận được âm thanh. Hãy kiểm tra quyền micro và thử lại." });
    recognition.onend = () => setCoachRecording(false);
    setCoachRecording(true); recognition.start();
  }

  async function exportPptx() {
    const PptxGenJS = (await import("pptxgenjs")).default;
    const pptx = new PptxGenJS(); pptx.layout = "LAYOUT_WIDE"; pptx.author = "MathSpeak"; pptx.subject = "Bilingual Mathematics Lesson";
    const colors = ["2563EB", "10B981", "F97316", "7C3AED"];
    slides.forEach((item, i) => {
      const slide = pptx.addSlide(); const color = colors[i % colors.length];
      slide.background = { color: "F8FAFC" };
      slide.addShape(pptx.ShapeType.roundRect, { x: .5, y: .45, w: 12.3, h: 6.55, rectRadius: .12, fill: { color: "FFFFFF" }, line: { color: "E2E8F0" } });
      slide.addText(item.kind.toUpperCase(), { x: .9, y: .75, w: 5.8, h: .35, color, bold: true, fontFace: "Aptos", fontSize: 11, charSpacing: 1.4 });
      const useSourceImage = Boolean(sourceImage && (item.kind === "Lesson title" || item.kind === "Worked example from file"));
      slide.addText(item.title, { x: .9, y: 1.3, w: useSourceImage ? 6.8 : 9.5, h: 1.1, color: "0F172A", bold: true, fontFace: "Aptos Display", fontSize: item.term ? 36 : 30, margin: .03 });
      slide.addText(item.body, { x: .95, y: 2.7, w: useSourceImage ? 6.7 : 9.2, h: 1.5, color: "475569", fontFace: "Aptos", fontSize: item.sourceExample ? 16 : 20, margin: .03, breakLine: false });
      slide.addShape(pptx.ShapeType.roundRect, { x: useSourceImage ? 7.2 : 10.45, y: useSourceImage ? 4.75 : 1.4, w: useSourceImage ? .7 : 1.5, h: useSourceImage ? .7 : 1.5, rectRadius: .08, fill: { color, transparency: 7 }, line: { color, transparency: 100 } });
      slide.addText(item.visual || "✓", { x: useSourceImage ? 7.27 : 10.55, y: useSourceImage ? 4.86 : 1.66, w: useSourceImage ? .56 : 1.28, h: useSourceImage ? .42 : .72, color: "FFFFFF", bold: true, fontFace: "Aptos", fontSize: useSourceImage ? 20 : 32, align: "center", valign: "middle", margin: 0 });
      if (item.term) slide.addText("🔊  Listen • Repeat • Use it", { x: .95, y: 4.55, w: 6, h: .45, color, bold: true, fontFace: "Aptos", fontSize: 16 });
      if (useSourceImage) slide.addImage({ data: sourceImage, x: 8.15, y: 1.25, w: 3.9, h: 4.85, transparency: 3 });
      slide.addText(`${String(i + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")} · MathSpeak`, { x: .9, y: 6.35, w: 11.2, h: .25, color: "94A3B8", fontFace: "Aptos", fontSize: 9, align: "right" });
    });
    await pptx.writeFile({ fileName: "MathSpeak_Bilingual_Lesson.pptx" });
  }

  function exportDoc(mode: "student" | "answers-en" | "answers-vi") {
    const title = mode === "student" ? "ENGLISH MATHEMATICS WORKSHEET" : mode === "answers-en" ? "ANSWER KEY — ENGLISH" : "ĐÁP ÁN — TIẾNG VIỆT";
    const safeFile = escapeHtml(fileName || "Sample mathematics lesson");
    const answerLabel = mode === "answers-vi" ? "Lời giải:" : "Answer:";
    const html = `<html><head><meta charset="utf-8"><style>@page{size:A4;margin:1.5cm 1.5cm 1.5cm 2cm}body{font-family:Arial;color:#172033}h1{color:#2563eb}.meta{color:#64748b}.q{margin:14px 0;padding:12px;border:1px solid #dbe4f0;border-radius:10px}.type{color:#f97316;font-size:10px;font-weight:bold}.answer{margin-top:8px;padding:8px;background:#eefaf5;color:#08785c}.line{height:28px;border-bottom:1px solid #cbd5e1}</style></head><body><h1>${title}</h1><p class="meta">${mode === "answers-vi" ? "Bài học nguồn" : "Source file"}: ${safeFile} · ${mode === "answers-vi" ? "Tổng điểm" : "Total"}: 1200</p>${mode === "student" ? `<p>Name: ____________________ &nbsp; Class: __________</p>` : ""}${questions.map((q,i)=>`<div class="q"><span class="type">${escapeHtml(q.type)} · ${q.points} points</span><p><b>${i+1}.</b> ${escapeHtml(q.prompt)}</p>${q.options ? `<p>${q.options.map((option,index)=>`${String.fromCharCode(65+index)}. ${escapeHtml(option)}`).join("<br>")}</p>` : ""}${mode !== "student" ? `<div class="answer"><b>${answerLabel}</b> ${escapeHtml(mode === "answers-vi" ? q.answerVi : q.answer)}</div>` : `<div class="line"></div>`}</div>`).join("")}</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "application/msword" }));
    const names = { student: "MathSpeak_English_Worksheet.doc", "answers-en": "MathSpeak_Answer_Key_English.doc", "answers-vi": "MathSpeak_Answer_Key_Vietnamese.doc" };
    const a = document.createElement("a"); a.href = url; a.download = names[mode]; a.click(); URL.revokeObjectURL(url);
  }

  const activeSlide = slides[mockSlide] || slides[0];
  const fullTeachingScript = commands.join(" ");
  const coachTargetVi = script.find(step => step.line === coachTarget)?.vi || (coachTarget === fullTeachingScript ? script.map(step => step.vi).join(" ") : "");

  return <div className="page-content builder-page">
    <section className="builder-hero"><span className="eyebrow"><WandSparkles size={15}/> FILE-TO-LESSON WORKFLOW</span><h1>Từ giáo án đến tiết dạy tiếng Anh hoàn chỉnh</h1><p>Tải file, soạn kịch bản, luyện nói, tạo slide, tập giảng và xuất phiếu bài tập theo đúng một tiến trình.</p></section>

    <div className="workflow-timeline">
      {["Tải file", "Kịch bản", "Slide & PPT", "Luyện giảng", "Phiếu bài tập"].map((label, index) => <div key={label} className={workflowStep > index + 1 ? "done" : workflowStep === index + 1 ? "active" : ""}><span>{workflowStep > index + 1 ? <Check size={14}/> : index + 1}</span><b>{label}</b></div>)}
    </div>

    <section className="workflow-card card">
      <div className="card-title"><span className="icon-box blue"><UploadCloud/></span><div><small>BƯỚC 1</small><h2>Tải giáo án hoặc tài liệu bài học</h2></div></div>
      <button className={`dropzone ${status}`} onClick={() => inputRef.current?.click()}><input ref={inputRef} type="file" accept=".pdf,.docx,.txt" onChange={e => e.target.files?.[0] && readFile(e.target.files[0])}/>{status === "reading" ? <><span className="spinner"/><b>Đang đọc nội dung và hình minh họa…</b></> : status === "ready" ? <><Check size={34}/><b>{lessonTitle}</b><span>{fileName} · {sourceLength.toLocaleString("vi-VN")} ký tự · {sourceWords.length} thuật ngữ · {sourceExamples.length} ví dụ{sourceImage ? " · có ảnh tham khảo từ PDF" : ""}</span></> : status === "error" ? <><CircleHelp size={34}/><b>Chưa đọc được file</b><span>Hỗ trợ PDF có lớp văn bản, DOCX hoặc TXT tối đa 20 MB; PDF ảnh quét cần OCR trước.</span></> : <><UploadCloud size={36}/><b>Thả PDF/Word vào đây</b><span>PDF, DOCX hoặc TXT · tối đa 20 MB</span></>}</button>
      {status === "ready" && workflowStep === 1 && <button className="primary workflow-cta" onClick={()=>setWorkflowStep(2)}><WandSparkles size={18}/> Bắt đầu soạn nội dung giảng dạy từ file</button>}
      <div className="privacy-note"><ShieldCheck size={16}/> Nội dung được xử lý trên thiết bị để tạo các bước tiếp theo.</div>
    </section>

    {workflowStep >= 2 && <section className="workflow-card card">
      <div className="card-title"><span className="icon-box green"><Sparkles/></span><div><small>BƯỚC 2</small><h2>Kịch bản dạy học ngắn + luyện nói</h2></div><span className="ready-tag">FROM FILE</span></div>
      <div className="teaching-script-list">{script.map((step, i) => <div key={step.phase}><span>{i + 1}</span><div><small>{step.phase}</small><p>{step.line}</p><p className="script-translation">{step.vi}</p></div><div className="script-actions"><button onClick={()=>onSpeak(step.line)} title="Nghe câu mẫu"><Volume2 size={17}/></button><button onClick={()=>startCoach(step.line)} title="Luyện nói câu này"><Mic size={17}/></button></div></div>)}</div>
      {coachResult && workflowStep === 2 && <div className="mini-coach-result"><b>{coachResult.score}%</b><p>{coachResult.feedback}</p><button onClick={()=>onSpeak(coachTarget)}><Volume2 size={16}/> Nghe câu mẫu và nói theo</button></div>}
      <button className="primary workflow-cta" onClick={()=>{setWorkflowStep(3);setMockSlide(0);setCoachResult(null);}}><Presentation size={18}/> Tiếp theo: xây dựng bộ slide</button>
    </section>}

    {workflowStep >= 3 && <section className="workflow-card card">
      <div className="studio-head"><div><span className="eyebrow"><Presentation size={15}/> BƯỚC 3 · AUTO-SLIDE</span><h2>Slide dạy bài theo tiến trình</h2><p className="section-note">Từ vựng & phát âm → khái niệm cơ bản → ví dụ có hướng dẫn → bài tập ngắn → exit ticket.</p></div><button className="primary" onClick={exportPptx}><Download size={17}/> Tải PowerPoint</button></div>
      <div className="lesson-slide-workspace">
        <div className="lesson-slide-preview">{sourceImage && (activeSlide.kind === "Lesson title" || activeSlide.kind === "Worked example from file") && <img src={sourceImage} alt="Trang tài liệu được dùng làm hình minh họa tham khảo"/>}<div className="slide-top"><span>{activeSlide.kind}</span><small>{String(mockSlide + 1).padStart(2,"0")} / {String(slides.length).padStart(2,"0")}</small></div>{activeSlide.visual && <div className="slide-visual" aria-hidden="true">{activeSlide.visual}</div>}<h3>{activeSlide.title}</h3><p>{activeSlide.body}</p>{activeSlide.term && <button onClick={()=>onSpeak(activeSlide.term!.term)}><Volume2/> Nghe phát âm</button>}<footer>MathSpeak · Source: {fileName}</footer></div>
        <div className="lesson-slide-list">{slides.map((slide, i) => <button key={`${slide.kind}-${i}`} className={mockSlide === i ? "active" : ""} onClick={()=>setMockSlide(i)}><span>{i + 1}</span><div><small>{slide.kind}</small><b>{slide.title}</b></div></button>)}</div>
      </div>
      <div className="ppt-note"><CircleHelp size={16}/> Bản web có nút phát âm. File PPTX giữ IPA và chỉ dẫn nghe–nhắc lại; ảnh trang đầu PDF được dùng làm hình tham khảo khi có thể trích xuất.</div>
      {workflowStep === 3 && <button className="primary workflow-cta" onClick={()=>{setWorkflowStep(4);setCoachResult(null);}}><Mic size={18}/> Tiếp theo: vào phòng tập giảng</button>}
    </section>}

    {workflowStep >= 4 && <section className="workflow-card card ai-coach-room">
      <div className="card-title"><span className="icon-box blue"><Mic/></span><div><small>BƯỚC 4</small><h2>Phòng tập giảng · Trợ lý luyện nói</h2></div><span className="ready-tag">MIC + RUBRIC</span></div>
      <div className="coach-grid"><div className="coach-prompt"><small>KỊCH BẢN GỢI Ý</small>{script.map(step=><p key={step.phase}><b>{step.phase}:</b> {step.line}<span className="script-translation">{step.vi}</span></p>)}<button className="secondary" onClick={()=>onSpeak(fullTeachingScript)}><Volume2 size={17}/> Nghe toàn bộ mẫu</button></div><div className="coach-recorder"><div className={`coach-orb ${coachRecording ? "recording" : ""}`}><Mic size={30}/></div><h3>{coachRecording ? "Đang nghe bài giảng…" : "Sẵn sàng tập giảng"}</h3><p>Nói bằng tiếng Anh theo kịch bản hoặc diễn đạt tự nhiên cùng các thuật ngữ chính.</p><button className="primary" onClick={()=>startCoach(fullTeachingScript)} disabled={coachRecording}><Mic size={18}/> {coachRecording ? "Đang ghi nhận…" : "Bắt đầu giảng thử"}</button></div></div>
      {coachResult && <div className="coach-feedback"><div className="coach-score"><b>{coachResult.score}</b><span>/100</span></div><div><h3>Nhận xét</h3><p>{coachResult.feedback}</p>{coachResult.transcript && <p className="heard-line"><b>Hệ thống nghe được:</b> “{coachResult.transcript}”</p>}{coachResult.missed.length > 0 && <div className="missed-words"><b>Các từ chưa nghe rõ:</b>{coachResult.missed.map(word=><button key={word} onClick={()=>onSpeak(word)}>{word} <Volume2 size={14}/></button>)}</div>}<div className="model-line"><b>Gợi ý để nói theo</b><p>{coachTarget}</p>{coachTargetVi && <p className="script-translation">{coachTargetVi}</p>}<button onClick={()=>onSpeak(coachTarget)}><Volume2 size={16}/> Nghe mẫu chậm</button></div></div></div>}
      <div className="coach-disclosure"><ShieldCheck size={15}/> Phản hồi dựa trên từ mà trình duyệt nhận diện được; đây là hỗ trợ luyện nói, không thay thế đánh giá âm vị chuyên sâu.</div>
      {workflowStep === 4 && <button className="primary workflow-cta" onClick={()=>setWorkflowStep(5)}><FileText size={18}/> Tiếp theo: tạo phiếu bài tập</button>}
    </section>}

    {workflowStep >= 5 && <section className="worksheet workflow-card card"><div className="card-title"><span className="icon-box orange"><FileText/></span><div><small>BƯỚC 5 · FILE-BASED WORKSHEET</small><h2>Một bản đề tiếng Anh + hai bản giải</h2></div><span className="ready-tag">6 QUESTIONS · 1200 POINTS</span></div><div className="worksheet-controls"><div className="worksheet-tabs"><button className={worksheetView === "student" ? "active" : ""} onClick={()=>setWorksheetView("student")}>Bản đề EN</button><button className={worksheetView === "answers-en" ? "active" : ""} onClick={()=>setWorksheetView("answers-en")}>Đáp án EN</button><button className={worksheetView === "answers-vi" ? "active" : ""} onClick={()=>setWorksheetView("answers-vi")}>Đáp án VI</button></div><div className="layout-spec"><span>Lề trái <b>2.0 cm</b></span><span>Bản đề <b>Full English</b></span><span>Nguồn <b>File đã tải</b></span></div><button className="secondary" onClick={()=>exportDoc("student")}><Download size={17}/> Tải đề EN</button><button className="secondary" onClick={()=>exportDoc("answers-en")}><Download size={17}/> Tải đáp án EN</button><button className="primary" onClick={()=>exportDoc("answers-vi")}><Download size={17}/> Tải đáp án VI</button></div><div className={`worksheet-preview ${worksheetView !== "student" ? "answer-key" : ""}`}><header><span>{worksheetView === "student" ? "ENGLISH MATHEMATICS WORKSHEET" : worksheetView === "answers-en" ? "ANSWER KEY — ENGLISH" : "ĐÁP ÁN — TIẾNG VIỆT"}</span><b>{lessonTitle}</b><small>{worksheetView === "student" ? "Name: ____________________   Class: ________" : worksheetView === "answers-en" ? "Suggested answers and marking guidance" : "Lời giải và hướng dẫn chấm bằng tiếng Việt"}</small></header>{questions.map((question,i)=><div className="worksheet-q" key={`${question.type}-${i}`}><span>{i+1}</span><div><small>{question.type}</small><p>{question.prompt}</p>{question.options && <div className="question-options">{question.options.map((option,index)=><i key={option}>{String.fromCharCode(65+index)}. {option}</i>)}</div>}{worksheetView !== "student" && <div className="worksheet-answer"><b>{worksheetView === "answers-vi" ? "Lời giải" : "Answer"}</b>{worksheetView === "answers-vi" ? question.answerVi : question.answer}</div>}</div><b>{question.points} pts</b></div>)}</div></section>}
  </div>;
}

type ClassMember = { id: string; name: string; lastActive: string };

function ClassManager({ currentCompleted: _currentCompleted, currentStreak: _currentStreak }: { currentCompleted: number; currentStreak: number }) {
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mathspeak-class-roster") || "[]");
      if (Array.isArray(saved)) setMembers(saved.filter(item => item && typeof item.name === "string").map(item => ({ id: String(item.id || crypto.randomUUID()), name: item.name, lastActive: item.lastActive || "Chưa rõ" })));
    } catch { /* Keep the roster empty. */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("mathspeak-class-roster", JSON.stringify(members));
  }, [members]);

  function saveMember() {
    const learnerName = name.trim();
    if (!learnerName) return;
    const existing = members.find(member => member.name.toLocaleLowerCase("vi") === learnerName.toLocaleLowerCase("vi"));
    if (existing) setMembers(old => old.map(member => member.id === existing.id ? { ...member, lastActive: new Date().toLocaleString("vi-VN") } : member));
    else setMembers(old => [...old, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: learnerName, lastActive: new Date().toLocaleString("vi-VN") }]);
    setName("");
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(window.location.origin);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  return <div className="page-content class-page">
    <section className="class-hero"><div><span className="eyebrow"><Users size={15}/> CHIA SẺ & NGƯỜI THAM GIA</span><h1>Ai có link đều có thể tự học</h1><p>MathSpeak đang mở công khai. Không cần tạo lớp, giao bài hay chờ phê duyệt; mỗi người tự chọn nội dung và lưu tiến trình trên thiết bị của mình.</p></div><button className="primary" onClick={copyInvite}><Link2 size={18}/>{copied ? "Đã sao chép link" : "Sao chép link học"}</button></section>
    <div className="class-stats"><div><span><Users/></span><small>ĐÃ GHI TÊN TRÊN MÁY NÀY</small><b>{members.length}</b></div><div><span><Link2/></span><small>QUYỀN TRUY CẬP</small><b>Công khai</b></div><div><span><BookOpen/></span><small>HÌNH THỨC</small><b>Tự học</b></div></div>
    <section className="class-enroll card"><div><span className="icon-box blue"><UserPlus/></span><div><small>SỔ NGƯỜI THAM GIA GỌN NHẸ</small><h2>Ghi tên người đã vào học</h2></div></div><div className="enroll-form simple"><label>Tên hiển thị<input value={name} onChange={event => setName(event.target.value)} onKeyDown={event => event.key === "Enter" && saveMember()} placeholder="Ví dụ: Nguyễn An"/></label><button className="primary" onClick={saveMember}><Check size={17}/> Ghi tên</button></div><div className="class-truth"><ShieldCheck size={16}/><span><b>Lưu ý minh bạch:</b> App không tự nhận diện danh tính người mở link và không thu thập danh sách từ thiết bị khác. Mục này chỉ là sổ ghi tên trên thiết bị hiện tại; muốn thống kê tự động cần hệ thống tài khoản và cơ sở dữ liệu dùng chung.</span></div></section>
    <section className="class-roster card"><div className="roster-head"><div><span className="eyebrow"><Users size={15}/> NGƯỜI THAM GIA</span><h2>Danh sách đã ghi tên</h2></div></div>{members.length ? <div className="roster-table"><div className="roster-row simple roster-labels"><span>Người học</span><span>Lần ghi nhận gần nhất</span><span/></div>{members.map(member => <div className="roster-row simple" key={member.id}><span className="member-name"><i>{member.name.slice(0, 2).toUpperCase()}</i><b>{member.name}</b></span><span>{member.lastActive}</span><button aria-label={`Xóa ${member.name} khỏi danh sách`} title="Xóa khỏi danh sách" onClick={() => setMembers(old => old.filter(item => item.id !== member.id))}><Trash2 size={16}/></button></div>)}</div> : <div className="empty-roster"><Users size={36}/><h3>Chưa ghi tên người học nào</h3><p>Người học vẫn có thể dùng toàn bộ app mà không cần xuất hiện trong danh sách này.</p></div>}</section>
  </div>;
}

function QACenter() {
  const corrections = dictionary.flatMap(unit => unit.words.filter(word => word.note).map(word => ({ unit: unit.id, ...word })));
  const gates = [
    ["Số học", "Tổng điểm và phép tính được khóa kiểm tra; worksheet = 6 × 200 = 1200 điểm."],
    ["Hình học", "Không dùng hình minh họa giả lập làm bằng chứng; thuật ngữ và nhãn hình được đối chiếu trước khi xuất."],
    ["Logic trò chơi", "Thứ tự Unit 1 → 12, chỉ số câu hỏi tăng tiến và điều hướng không đảo chiều."],
    ["Ngôn ngữ", "567 mục từ được kiểm đếm; IPA, loại từ, nghĩa và thuật ngữ được gắn cờ khi nguồn có lỗi."]
  ];
  return <div className="page-content qa-page"><section className="qa-hero"><div><span className="eyebrow"><ShieldCheck size={15}/> QUALITY CHECK</span><h1>Đúng trước, đẹp sau</h1><p>Bản hiện tại công khai bốn nhóm kiểm tra nền tảng để người dùng biết rõ phạm vi đã được rà soát.</p></div><div className="qa-score"><ShieldCheck/><b>4/4</b><span>nhóm kiểm tra nền tảng</span></div></section><div className="qa-gates">{gates.map(([title,text],i)=><div className="qa-gate" key={title}><span><Check/></span><small>CHECK 0{i+1}</small><h3>{title}</h3><p>{text}</p></div>)}</div><section className="correction-table card"><div className="card-title"><span className="icon-box blue"><Search/></span><div><small>EDITORIAL AUDIT</small><h2>Các hiệu chỉnh từ PDF nguồn</h2></div><span className="ready-tag">{corrections.length} FLAGS</span></div><div className="table-wrap"><table><thead><tr><th>Vị trí</th><th>Thuật ngữ dùng trong app</th><th>Nghĩa</th><th>Lý do hiệu chỉnh</th></tr></thead><tbody>{corrections.map(word=><tr key={word.id}><td>{word.unit===0?"Khởi động":`Unit ${word.unit}`} · #{word.index}</td><td><b>{word.term}</b></td><td>{word.meaning}</td><td>{word.note}</td></tr>)}</tbody></table></div></section><section className="truth-box"><CircleHelp/><div><b>Phạm vi bản hiện tại</b><p>Đọc mẫu dùng giọng Text-to-Speech; nhận diện và phản hồi luyện giảng dùng Web Speech API cùng rubric đối chiếu kịch bản, nên kết quả có thể khác nhau theo thiết bị. Các phép kiểm tra giúp giảm lỗi nhưng không thay thế bước giáo viên đọc duyệt nội dung trước khi sử dụng chính thức.</p></div></section></div>;
}
