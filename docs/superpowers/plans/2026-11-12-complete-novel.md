# Complete family novel implementation plan

User approved the expanded script in chat, including implementation and publication. This supersedes the original submitted scenario; the submitted DOCX remains untouched.

Goal: playable Ukrainian novel about grandmother Lidiya, mother Melissa and older sister Sofia, fair evidence-based puzzles and eight automatic illustrated endings.

Architecture: dependency-free browser app. Engine v2 owns outcomes and irreversible confirmations; story.js supplies dialogue arrays and object clues; flow.js supplies presentation; visual.js retains era sprites and device animations; app.js renders accessible dialogs, album, settings and ending form. Native MP3 music remains.

## Contract

- Chapters prologue/vinyl/tape/cd/finale; phases intro/explore/puzzle/result/absence/closure/finale/ended. Each narrative phase has cursor, reading never solves puzzles.
- Narrative beats `{speaker,text}`; object `{id,label,text,x,y}`; each chapter has `intro`, `objects`, `hints` (3 graduated strings), `result:{saved:[],lost:[]}`, `absence:[]`, `closure:{saved:[],lost:[]}`, era/title/person/memory metadata.
- Prologue establishes family evening, old wardrobe, box, side A and embodied memory. Prologue intro ends in optional exploration; enter starts vinyl.
- Vinyl five stages, small errors retry; risky damaging actions ask confirmation. Successful LP gifted, damaged LP retained as silent keepsake, Jessica uses her spare so meeting still happens.
- Tape order road/meeting/unsaid then dual-deck copy: A original for Melissa, B blank. All copy actions confirm overwrite; A→B preserves voice, B→A erases it. Friendship/farewell, not duplicate romance.
- CD demo AudioCD, concert MP3, incomplete AudioCD. Clues: actual event14May2004,12numbers,23:18, introphrase. Optional preview through compatible device; archive confirmation for every selection; concert is correct. Wrong archive retains rehearsal/incomplete rather than important concert.
- Absence is explicitly hypothetical, uses different scene and silence; closure restores actual scene and describes real outcome.
- Outcome key order vinyl/tape/cd:111 together;110 mother/grandma phone Johnny;101 grandma/sister exchange;011 reunion;100 grandma visit;010 mother bus route;001 sisters record new sounds;000 Luka shop. Internet returns in every ending.
- Finale optional personal song title100chars and memory500chars, plain text escaped, never actually fetched/played. No arbitrary ending selector. All8 final scenes illustrated; album3 photos with audio condition.
- Save version2 strict parsing. Legacy v1 recognized and starts new story with clear migration notice; old raw save retained. New storagekey prevents overwriting old file.

## Tasks

- [x] Story data and expanded living dialogue; each core episode roughly20–30 beats plus consequence and closure.
- [x] Engine/tests for all8 paths, risk cancellation, retries, save validation and legacy migration.
- [x] Art:8 endings,3 absence scenes, Marko sprite. References preserve heroine and family identity; existing sprites/outfits retained.
- [x] UI/flow, journal, optional clues, visible irreversible confirmation, personal ending text,8-gallery.
- [x] Independent review, browser pass at desktop/mobile and native music, package and publish existing public Sites project (publication result recorded by Sites).

Ruling: the approved outline is the binding design; proceed without another approval loop. Existing isolated feature checkout is retained. Do not push to GitHub origin; Sites source publication is the requested delivery.
