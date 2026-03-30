const namesInput = document.getElementById("names");
const shuffleBtn = document.getElementById("shuffle");
const clearBtn = document.getElementById("clear");
const demoBtn = document.getElementById("demo");
const bracketEl = document.getElementById("bracket");
const metaEl = document.getElementById("meta");

const demoNames = [
  "Jeferson",
  "Cinthia",
  "Jhon",
  "Rapha Milfont",
  "Rapha Azevedo",
  "Caio",
  "Nilcelio",
  "Gil",
  "Miguel",
  "Noemi",
  "Gaúcho",
];

function cleanNames(raw) {
  return raw
    .split("\n")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

function isPowerOfTwo(n) {
  return n > 0 && (n & (n - 1)) === 0;
}

function highestPowerOfTwoBelow(n) {
  return 2 ** Math.floor(Math.log2(n));
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function assignSchedule(rounds, startHour = 7, courts = 2) {
  let slotIndex = 0;

  rounds.forEach((round) => {
    round.forEach((match, matchIdx) => {
      const court = (matchIdx % courts) + 1;
      const hour = startHour + slotIndex;
      match.time = `${pad2(hour)}:00`;
      match.court = `Quadra ${court}`;

      if (matchIdx % courts === courts - 1 || matchIdx === round.length - 1) {
        slotIndex += 1;
      }
    });
  });
}

function applyScheduleOverrides(rounds, overrides) {
  const matches = rounds.flat();
  Object.entries(overrides).forEach(([name, pref]) => {
    const target = matches.find((match) => match.players.includes(name));
    if (!target) return;

    const desiredTime = pref.time;
    const desiredCourt = `Quadra ${pref.court}`;
    const occupying = matches.find(
      (match) => match.time === desiredTime && match.court === desiredCourt
    );

    if (occupying && occupying !== target) {
      const tempTime = target.time;
      const tempCourt = target.court;
      target.time = desiredTime;
      target.court = desiredCourt;
      occupying.time = tempTime;
      occupying.court = tempCourt;
    } else {
      target.time = desiredTime;
      target.court = desiredCourt;
    }
  });
}

const scheduleOverrides = {
  Jeferson: { time: "09:00", court: 1 },
  "Gaúcho": { time: "10:00", court: 2 },
};

function buildStandardBracket(participants) {
  const rounds = [];
  let current = [];
  for (let i = 0; i < participants.length; i += 2) {
    current.push({
      id: `r1m${i / 2}`,
      players: [participants[i], participants[i + 1]],
      winner: null,
    });
  }
  rounds.push(current);

  let roundIndex = 2;
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push({
        id: `r${roundIndex}m${i / 2}`,
        players: ["A definir", "A definir"],
        winner: null,
      });
    }
    rounds.push(next);
    current = next;
    roundIndex += 1;
  }

  return rounds;
}

function buildRounds(participants) {
  const hasSeeds = participants.length >= 2;
  const seed1 = hasSeeds ? participants[0] : null;
  const seed2 = hasSeeds ? participants[participants.length - 1] : null;
  const middle = hasSeeds ? participants.slice(1, -1) : participants.slice();
  const middleShuffled = shuffleArray(middle);

  if (isPowerOfTwo(participants.length)) {
    const ordered = hasSeeds
      ? [seed1, ...middleShuffled, seed2]
      : middleShuffled;
    const rounds = buildStandardBracket(ordered);
    const result = {
      rounds,
      byes: 0,
      totalSlots: participants.length,
      firstRoundGames: rounds[0].length,
    };

    assignSchedule(result.rounds);
    applyScheduleOverrides(result.rounds, scheduleOverrides);
    return result;
  }

  if (participants.length === 11) {
    const prelimPlayers = middleShuffled.slice(0, 6);
    const byePlayers = middleShuffled.slice(6, 9);

    const rounds = [];
    const round1 = [];

    for (let i = 0; i < 3; i += 1) {
      round1.push({
        id: `r1m${i}`,
        players: [prelimPlayers[i * 2], prelimPlayers[i * 2 + 1]],
        winner: null,
        targetMatch: i,
        targetSlot: 1,
      });
    }
    rounds.push(round1);

    const round2 = [
      {
        id: "r2m0",
        players: [seed1, "A definir"],
        winner: null,
      },
      {
        id: "r2m1",
        players: [byePlayers[0], "A definir"],
        winner: null,
      },
      {
        id: "r2m2",
        players: [byePlayers[1], "A definir"],
        winner: null,
      },
      {
        id: "r2m3",
        players: [seed2, byePlayers[2]],
        winner: null,
      },
    ];
    rounds.push(round2);

    let current = round2;
    let roundIndex = 3;
    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        next.push({
          id: `r${roundIndex}m${i / 2}`,
          players: ["A definir", "A definir"],
          winner: null,
        });
      }
      rounds.push(next);
      current = next;
      roundIndex += 1;
    }

    const result = {
      rounds,
      byes: 5,
      totalSlots: 16,
      firstRoundGames: rounds[0].length,
    };

    assignSchedule(result.rounds);
    applyScheduleOverrides(result.rounds, scheduleOverrides);
    return result;
  }

  const mainSize = highestPowerOfTwoBelow(participants.length);
  const prelimMatches = participants.length - mainSize;
  const byes = mainSize - prelimMatches;

  const byePlayers = [];
  const remaining = [];
  let remainingByes = byes;

  if (seed1) {
    if (remainingByes >= 1) remainingByes -= 1;
    else remaining.push(seed1);
  }
  if (seed2) {
    if (remainingByes >= 1) remainingByes -= 1;
    else remaining.push(seed2);
  }

  while (byePlayers.length < remainingByes && middleShuffled.length > 0) {
    byePlayers.push(middleShuffled.shift());
  }

  remaining.push(...middleShuffled);

  const prelimPlayers = remaining.slice(0, prelimMatches * 2);

  const rounds = [];
  const round1 = [];

  const round2Slots = Array(mainSize).fill("A definir");
  if (seed1) round2Slots[0] = seed1;
  if (seed2) round2Slots[mainSize - 1] = seed2;

  const openSlots = round2Slots
    .map((value, idx) => (value === "A definir" ? idx : null))
    .filter((idx) => idx !== null);

  byePlayers.forEach((player) => {
    if (openSlots.length === 0) return;
    const slot = openSlots.shift();
    round2Slots[slot] = player;
  });

  for (let i = 0; i < prelimMatches; i += 1) {
    const targetSlot = openSlots.shift();
    round1.push({
      id: `r1m${i}`,
      players: [prelimPlayers[i * 2], prelimPlayers[i * 2 + 1]],
      winner: null,
      targetSlot,
    });
  }
  rounds.push(round1);

  const round2 = [];
  for (let i = 0; i < round2Slots.length; i += 2) {
    round2.push({
      id: `r2m${i / 2}`,
      players: [round2Slots[i], round2Slots[i + 1]],
      winner: null,
    });
  }
  rounds.push(round2);

  let current = round2;
  let roundIndex = 3;
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push({
        id: `r${roundIndex}m${i / 2}`,
        players: ["A definir", "A definir"],
        winner: null,
      });
    }
    rounds.push(next);
    current = next;
    roundIndex += 1;
  }

  const result = {
    rounds,
    byes,
    totalSlots: mainSize * 2,
    firstRoundGames: rounds[0].length,
  };

  assignSchedule(result.rounds);
  applyScheduleOverrides(result.rounds, scheduleOverrides);
  return result;
}

function renderBracket(state) {
  bracketEl.innerHTML = "";

  state.rounds.forEach((round, roundIdx) => {
    const roundEl = document.createElement("div");
    roundEl.className = "round";

    const title = document.createElement("h3");
    title.textContent = `Round ${roundIdx + 1}`;
    roundEl.appendChild(title);

    round.forEach((match, matchIdx) => {
      const matchEl = document.createElement("div");
      matchEl.className = "match";

      const meta = document.createElement("div");
      meta.className = "match-meta";
      meta.textContent = `${match.court} • ${match.time}`;
      matchEl.appendChild(meta);

      match.players.forEach((player, playerIdx) => {
        const playerEl = document.createElement("div");
        playerEl.className = "player";
        playerEl.textContent = player;

        if (player === "BYE" || player === "A definir") {
          playerEl.classList.add("bye");
        }

        if (match.winner === player && player !== "BYE") {
          playerEl.classList.add("winner");
        }

        playerEl.addEventListener("click", () => {
          if (player === "BYE" || player === "A definir") return;
          advanceWinner(state, roundIdx, matchIdx, playerIdx);
        });

        matchEl.appendChild(playerEl);
      });

      roundEl.appendChild(matchEl);
    });

    bracketEl.appendChild(roundEl);
  });
}

function advanceWinner(state, roundIdx, matchIdx, playerIdx) {
  const match = state.rounds[roundIdx][matchIdx];
  const player = match.players[playerIdx];
  if (!player || player === "BYE" || player === "A definir") return;

  match.winner = player;

  const nextRound = state.rounds[roundIdx + 1];
  if (nextRound) {
    if (roundIdx === 0 && typeof match.targetMatch === "number") {
      const nextMatchIdx = match.targetMatch;
      const slotIdx =
        typeof match.targetSlot === "number" ? match.targetSlot : 0;
      nextRound[nextMatchIdx].players[slotIdx] = player;
    } else if (roundIdx === 0 && typeof match.targetSlot === "number") {
      const target = match.targetSlot;
      const nextMatchIdx = Math.floor(target / 2);
      const slotIdx = target % 2;
      nextRound[nextMatchIdx].players[slotIdx] = player;
    } else {
      const nextMatchIdx = Math.floor(matchIdx / 2);
      const slotIdx = matchIdx % 2;
      nextRound[nextMatchIdx].players[slotIdx] = player;
    }
  }

  renderBracket(state);
}

function updateMeta(participants, byes, totalSlots, firstRoundGames) {
  const rounds = Math.log2(totalSlots);
  metaEl.textContent = `Participantes: ${participants} | Jogos no 1º round: ${firstRoundGames} | Byes: ${byes} | Rounds: ${rounds}`;
}

shuffleBtn.addEventListener("click", () => {
  const participants = cleanNames(namesInput.value);
  if (participants.length < 2) {
    metaEl.textContent = "Insira pelo menos 2 participantes para sortear.";
    bracketEl.innerHTML = "";
    return;
  }

  const state = buildRounds(participants);
  renderBracket(state);
  updateMeta(participants.length, state.byes, state.totalSlots, state.firstRoundGames);
});

clearBtn.addEventListener("click", () => {
  namesInput.value = "";
  bracketEl.innerHTML = "";
  metaEl.textContent = "";
});

demoBtn.addEventListener("click", () => {
  namesInput.value = demoNames.join("\n");
  metaEl.textContent = "";
  bracketEl.innerHTML = "";
});
