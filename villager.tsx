#!/usr/bin/env bun

import { readFileSync } from "fs";
import { dirname, join } from "path";
import React from "react";
import { render, Box, Text } from "ink";

type Species = "Human" | "Dwarf" | "Elf" | "Halfling";

interface Villager {
  name: string;
  species: Species;
  occupation: string;
  look: string;
  stats: {
    STR: number;
    DEX: number;
    CON: number;
    INT: number;
    WIS: number;
    CHA: number;
    LUC: number;
  };
  modifiers: {
    STR: number;
    DEX: number;
    CON: number;
    INT: number;
    WIS: number;
    CHA: number;
    LUC: number;
  };
  hp: number;
  load: number;
  damage: string;
  gear: string[];
  bond: string;
  heritageMoves: string[];
}

type Dice = `${number}d${number}`;

function roll(dice: Dice): number {
  const [count, sides] = dice.split("d").map(Number);
  let sum = 0;
  for (let i = 0; i < count; i++) sum += Math.floor(Math.random() * sides) + 1;
  return sum;
}

function getMod(score: number): number {
  if (score === 3) return -3;
  if (score <= 5) return -2;
  if (score <= 8) return -1;
  if (score <= 12) return 0;
  if (score <= 15) return 1;
  if (score <= 17) return 2;
  return 3;
}

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

const DIR = dirname(import.meta.path);
const readTsv = (name: string) =>
  readFileSync(join(DIR, name), "utf-8")
    .trim()
    .split("\n")
    .map((line) => line.split("\t"));

const [, ...occupationRows] = readTsv("occupations.tsv");
const [, ...nameRows] = readTsv("names.tsv");
const [, ...lookRows] = readTsv("looks.tsv");
const [, ...bondRows] = readTsv("bonds.tsv");

const CROPS = [
  "barley",
  "onions",
  "peppers",
  "potatoes",
  "squash",
  "rice",
  "wheat",
  "hops",
  "beets",
  "oats",
];
const INSTRUMENTS = [
  "accordion (2 wt)",
  "drum (1 wt)",
  "fiddle (1 wt)",
  "flute",
  "guitar (1 wt)",
  "mbira",
  "horn (1 wt)",
  "banjo (1 wt)",
];
const ANIMAL_TRAINER_GEAR = [
  "leather gauntlet, falcon",
  "2 dogs, leashes",
  "monkey, music box (2 wt)",
  "cage (1 wt), 2 ferrets",
];

function expandGearTemplate(template: string): string {
  return template
    .replace(/\{(\d+)d(\d+)\}/g, (_, count, sides) =>
      String(roll(`${count}d${sides}` as Dice))
    )
    .replace(/\{2\+1d4\*2\}/g, () => String(2 + roll("1d4") * 2))
    .replace(/\{crop\}/g, () => CROPS[roll("1d10") - 1])
    .replace(/\{instrument\}/g, () => INSTRUMENTS[roll("1d8") - 1])
    .replace(
      /\{animal_trainer_gear\}/g,
      () => ANIMAL_TRAINER_GEAR[roll("1d4") - 1]
    )
    .replace(/\{poultry\}/g, () => {
      const birds = [
        `${roll("1d6")} chickens`,
        `${roll("1d6")} ducks`,
        `${roll("1d4")} geese`,
        `${roll("1d4")} swans`,
      ];
      return birds[roll("1d4") - 1];
    });
}

function parseRange(s: string): [number, number] {
  const parts = s.split("-").map(Number);
  return parts.length === 1 ? [parts[0], parts[0]] : [parts[0], parts[1]];
}

function getOccupation(rollResult: number): {
  name: string;
  gear: string;
  species: Species;
} {
  const row = occupationRows.find(([range]) => {
    const [min, max] = parseRange(range);
    return rollResult >= min && rollResult <= max;
  })!;
  return {
    name: row[1],
    gear: expandGearTemplate(row[2]),
    species: (row[3] as Species) || "Human",
  };
}

function getName(species: Species): string {
  const r = roll("1d20") - 1;
  const row = nameRows[r];
  switch (species) {
    case "Elf":
      return row[4];
    case "Dwarf":
      return row[5];
    case "Halfling":
      return row[6];
    default:
      if (roll("1d2") === 1) return row[roll("1d2")];
      return row[3];
  }
}

function getLook(): string {
  const [face, eyes, hair, body, clothing] = [
    lookRows[roll("1d20") - 1][1],
    lookRows[roll("1d20") - 1][2],
    lookRows[roll("1d20") - 1][3],
    lookRows[roll("1d20") - 1][4],
    lookRows[roll("1d20") - 1][5],
  ];
  return `${face.toLowerCase()} face, ${eyes.toLowerCase()} eyes, ${hair.toLowerCase()} hair, ${body.toLowerCase()} body, ${clothing.toLowerCase()} clothing`;
}

function getBond(): string {
  const row = bondRows[roll("1d20") - 1];
  const detail = row[roll("1d4")];
  return row[0].replace("...", detail);
}

function getHeritageMoves(species: Species): string[] {
  switch (species) {
    case "Dwarf":
      return [
        "Etched in Stone: When you appraise an artificial item, object, or location, the GM will tell you something interesting about the one who made it, no questions asked.",
      ];
    case "Elf":
      return [
        "These Elf Eyes: You see perfectly in the barest light and may focus your senses to Detect Magic at will.",
      ];
    case "Halfling":
      return [
        "Lucky: When you Tempt Fate and score a 10+ you don't suffer disadvantage and on a 12+ your luck rubs off; the nearest ally gains advantage on their next roll.",
      ];
    default:
      return [];
  }
}

export function generateVillager(): Villager {
  const stats = {
    STR: roll("3d6"),
    DEX: roll("3d6"),
    CON: roll("3d6"),
    INT: roll("3d6"),
    WIS: roll("3d6"),
    CHA: roll("3d6"),
    LUC: roll("3d6"),
  };

  const modifiers = {
    STR: getMod(stats.STR),
    DEX: getMod(stats.DEX),
    CON: getMod(stats.CON),
    INT: getMod(stats.INT),
    WIS: getMod(stats.WIS),
    CHA: getMod(stats.CHA),
    LUC: getMod(stats.LUC),
  };

  const occ = getOccupation(roll("1d100"));
  const hp = stats.CON + 4;
  const load = stats.STR + 4;

  return {
    name: getName(occ.species),
    species: occ.species,
    occupation: occ.name,
    look: getLook(),
    stats,
    modifiers,
    hp,
    load,
    damage: "d4",
    gear: [occ.gear],
    bond: getBond(),
    heritageMoves: getHeritageMoves(occ.species),
  };
}

function Stat({
  name,
  value,
  mod,
}: {
  name: string;
  value: number;
  mod: number;
}) {
  const modColor = mod > 0 ? "green" : mod < 0 ? "red" : "gray";
  return (
    <Box>
      <Text color="yellow">{name} </Text>
      <Text bold>{value.toString().padStart(2)}</Text>
      <Text color={modColor}> ({formatMod(mod).padStart(2)})</Text>
    </Box>
  );
}

function parseGear(gearStr: string): string[] {
  const items: string[] = [];
  let current = "";
  let depth = 0;
  for (const char of gearStr) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) {
      items.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

function VillagerCard({ v }: { v: Villager }) {
  const speciesColor =
    v.species === "Dwarf"
      ? "red"
      : v.species === "Elf"
      ? "cyan"
      : v.species === "Halfling"
      ? "green"
      : "white";

  const gearItems = v.gear.flatMap(parseGear);

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
      marginBottom={1}
    >
      <Box marginBottom={1}>
        <Text bold color="yellow">
          {v.name}
        </Text>
        <Text> the </Text>
        <Text bold>{v.occupation}</Text>
      </Box>

      <Box>
        <Text dimColor>{v.look}</Text>
      </Box>

      <Box marginTop={1} gap={2}>
        <Stat name="STR" value={v.stats.STR} mod={v.modifiers.STR} />
        <Stat name="DEX" value={v.stats.DEX} mod={v.modifiers.DEX} />
        <Stat name="CON" value={v.stats.CON} mod={v.modifiers.CON} />
      </Box>
      <Box gap={2}>
        <Stat name="INT" value={v.stats.INT} mod={v.modifiers.INT} />
        <Stat name="WIS" value={v.stats.WIS} mod={v.modifiers.WIS} />
        <Stat name="CHA" value={v.stats.CHA} mod={v.modifiers.CHA} />
      </Box>
      <Box>
        <Stat name="LUC" value={v.stats.LUC} mod={v.modifiers.LUC} />
      </Box>

      <Box marginTop={1} gap={3}>
        <Text>
          <Text color="red" bold>
            HP
          </Text>{" "}
          {v.hp}
        </Text>
        <Text>
          <Text color="blue" bold>
            Load
          </Text>{" "}
          {v.load}
        </Text>
        <Text>
          <Text color="magenta" bold>
            Damage
          </Text>{" "}
          {v.damage}
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="cyan" bold>
          GEAR
        </Text>
        {gearItems.map((item, i) => (
          <Text key={i}> • {item}</Text>
        ))}
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="cyan" bold>
          BOND
        </Text>
        <Text> {v.bond}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="cyan" bold>
          MOVES
        </Text>
        {v.heritageMoves.map((move, i) => (
          <Box key={`heritage-${i}`} flexDirection="column">
            <Text wrap="wrap">
              {" "}
              • <Text color={speciesColor}>({v.species})</Text> {move}
            </Text>
          </Box>
        ))}
        <Box flexDirection="column">
          <Text wrap="wrap">
            {" "}
            • <Text bold>Know Your Stuff:</Text> When you Spout Lore or Discern
            Realities about something related to your occupation, tell the GM
            why you deserve advantage and take it if they agree. When you have
            the resources to do something you know how to do, you do it.
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

function App({ villagers }: { villagers: Villager[] }) {
  return (
    <Box flexDirection="column">
      {villagers.map((v, i) => (
        <VillagerCard key={i} v={v} />
      ))}
    </Box>
  );
}

const count = parseInt(process.argv[2] || "1", 10);
const villagers = Array.from({ length: count }, generateVillager);
render(<App villagers={villagers} />);
