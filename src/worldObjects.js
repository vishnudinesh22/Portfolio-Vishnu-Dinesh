import { dialogueData } from "./constants";

export const workstationLayout = {
  laptop: { x: 227, y: 77 },
  prototype: { x: 301, y: 126, width: 32, height: 24, solidY: 12, solidHeight: 8 },
};

export function getWorldObjects(config, mapData) {
  const boundaries = mapData.layers.find(layer => layer.name === "boundaries").objects;
  const boundary = name => boundaries.find(object => object.name === name);
  const degree = boundary("degree");
  const couch = boundary("sofa-table");
  const tv = boundary("tv");
  const prototype = workstationLayout.prototype;
  const objects = [
    { id: "intro", title: "Welcome to my world", text: config.introduction, x: 73, y: 112 },
    { id: "football", title: "Football first", label: config.objectNames.football, text: config.footballDialogue, x: 153, y: 135, labelY: 126 },
    { id: "cycling", title: config.objectNames.cycling, label: config.objectNames.cycling, text: config.cyclingDialogue, x: 198, y: 119, labelY: 106 },
    { id: "couch", title: config.objectNames.couch, label: config.objectNames.couch, text: config.couchDialogue, x: couch.x + couch.width / 2, y: couch.y + couch.height, labelY: couch.y - 2 },
    { id: "tv", title: config.objectNames.tv, label: config.objectNames.tv, text: "Where I unwind with my favourite series and movies.", x: tv.x + tv.width / 2, y: tv.y + tv.height / 2, labelY: tv.y - 2 },
    { id: "degree", title: config.objectNames.degree, label: config.objectNames.degree, text: "DESIGN THINKER\nVIA VIT SCHOOL OF DESIGN\n" + config.degree + "\n" + config.institution, note: config.story.certificateNote, x: degree.x + degree.width / 2, y: degree.y + degree.height, labelY: degree.y - 2 },
    { id: "uiux", title: "Explore My UI/UX Work", label: config.objectNames.uiux, text: "Digital experiences, interfaces, interactions, and human-centred solutions.", x: 238, y: 89, labelY: 77, link: config.uiuxPortfolioUrl },
    { id: "industrial", title: "Explore My Industrial Design Work", label: config.objectNames.industrial, text: "Physical products, thoughtful forms, materials, ergonomics, and problem-solving.", x: prototype.x + prototype.width / 2, y: prototype.y + 17, labelY: prototype.y - 2, link: config.industrialDesignPortfolioUrl },
  ];
  const extras = { pc: "My idea corner", bed: "Room for fresh ideas", library: "A shelf of inspiration", exit: "Thanks for visiting" };
  for (const object of boundaries.filter(item => extras[item.name])) {
    objects.push({ id: object.name, title: extras[object.name], text: dialogueData[object.name], x: object.x + object.width / 2, y: object.y + object.height / 2 });
  }
  return objects;
}
