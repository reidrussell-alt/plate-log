// 14 granular categories used by the exercise selector UI
export const SELECTOR_MUSCLE_GROUPS = [
  'Chest', 'Upper Back', 'Lats', 'Quads', 'Hamstrings', 'Glutes',
  'Front Delts', 'Side Delts', 'Rear Delts', 'Biceps', 'Triceps',
  'Forearms', 'Core', 'Calves'
];

export const EXERCISE_LIBRARY = [
  // CHEST (14)
  { id: 'bench_press',        name: 'Barbell Bench Press',         muscleGroup: 'Chest',      loadType: 'weight', isCustom: false },
  { id: 'incline_bench',      name: 'Incline Barbell Bench Press', muscleGroup: 'Chest',      loadType: 'weight', isCustom: false },
  { id: 'decline_bench',      name: 'Decline Barbell Bench Press', muscleGroup: 'Chest',      loadType: 'weight', isCustom: false },
  { id: 'db_press',           name: 'Dumbbell Bench Press',        muscleGroup: 'Chest',      loadType: 'weight', isCustom: false },
  { id: 'incline_db_press',   name: 'Incline Dumbbell Press',      muscleGroup: 'Chest',      loadType: 'weight', isCustom: false },
  { id: 'decline_db_press',   name: 'Decline Dumbbell Press',      muscleGroup: 'Chest',      loadType: 'weight', isCustom: false },
  { id: 'db_fly',             name: 'Dumbbell Flys',               muscleGroup: 'Chest',      loadType: 'weight', isCustom: false },
  { id: 'incline_db_fly',     name: 'Incline Dumbbell Flys',       muscleGroup: 'Chest',      loadType: 'weight', isCustom: false },
  { id: 'cable_fly',          name: 'Cable Fly (Low to High)',     muscleGroup: 'Chest',      loadType: 'weight', isCustom: false },
  { id: 'cable_fly_high',     name: 'Cable Fly (High to Low)',     muscleGroup: 'Chest',      loadType: 'weight', isCustom: false },
  { id: 'pec_deck',           name: 'Pec Deck Machine',            muscleGroup: 'Chest',      loadType: 'weight', isCustom: false },
  { id: 'pushups',            name: 'Push-Ups',                    muscleGroup: 'Chest',      loadType: 'bw',     isCustom: false },
  { id: 'dips_chest',         name: 'Dips (Chest Focused)',        muscleGroup: 'Chest',      loadType: 'bw',     isCustom: false },
  { id: 'landmine_press',     name: 'Landmine Press',              muscleGroup: 'Chest',      loadType: 'weight', isCustom: false },

  // UPPER BACK (11)
  { id: 'deadlift',           name: 'Conventional Deadlift',       muscleGroup: 'Upper Back', loadType: 'weight', isCustom: false },
  { id: 'barbell_row',        name: 'Barbell Row',                 muscleGroup: 'Upper Back', loadType: 'weight', isCustom: false },
  { id: 'pendlay_row',        name: 'Pendlay Row',                 muscleGroup: 'Upper Back', loadType: 'weight', isCustom: false },
  { id: 'db_row',             name: 'Dumbbell Row',                muscleGroup: 'Upper Back', loadType: 'weight', isCustom: false },
  { id: 'tbar_row',           name: 'T-Bar Row',                   muscleGroup: 'Upper Back', loadType: 'weight', isCustom: false },
  { id: 'chest_supported_row',name: 'Chest-Supported Row',         muscleGroup: 'Upper Back', loadType: 'weight', isCustom: false },
  { id: 'cable_row',          name: 'Seated Cable Row',            muscleGroup: 'Upper Back', loadType: 'weight', isCustom: false },
  { id: 'cable_row_wide',     name: 'Wide-Grip Cable Row',         muscleGroup: 'Upper Back', loadType: 'weight', isCustom: false },
  { id: 'machine_row',        name: 'Machine Row',                 muscleGroup: 'Upper Back', loadType: 'weight', isCustom: false },
  { id: 'inverted_row',       name: 'Inverted Row',                muscleGroup: 'Upper Back', loadType: 'bw',     isCustom: false },
  { id: 'meadows_row',        name: 'Meadows Row',                 muscleGroup: 'Upper Back', loadType: 'weight', isCustom: false },

  // LATS (8)
  { id: 'pullups',            name: 'Pull-Ups',                    muscleGroup: 'Lats',       loadType: 'bw',     isCustom: false },
  { id: 'chinups',            name: 'Chin-Ups',                    muscleGroup: 'Lats',       loadType: 'bw',     isCustom: false },
  { id: 'lat_pulldown',       name: 'Lat Pulldown',                muscleGroup: 'Lats',       loadType: 'weight', isCustom: false },
  { id: 'lat_pulldown_wide',  name: 'Wide-Grip Lat Pulldown',      muscleGroup: 'Lats',       loadType: 'weight', isCustom: false },
  { id: 'lat_pulldown_close', name: 'Close-Grip Lat Pulldown',     muscleGroup: 'Lats',       loadType: 'weight', isCustom: false },
  { id: 'straight_arm_pulldown', name: 'Straight-Arm Pulldown',   muscleGroup: 'Lats',       loadType: 'weight', isCustom: false },
  { id: 'single_arm_lat_pulldown', name: 'Single-Arm Lat Pulldown', muscleGroup: 'Lats',     loadType: 'weight', isCustom: false },
  { id: 'db_pullover',        name: 'Dumbbell Pullover',           muscleGroup: 'Lats',       loadType: 'weight', isCustom: false },

  // QUADS (15)
  { id: 'squat',              name: 'Barbell Back Squat',          muscleGroup: 'Quads',      loadType: 'weight', isCustom: false },
  { id: 'front_squat',        name: 'Front Squat',                 muscleGroup: 'Quads',      loadType: 'weight', isCustom: false },
  { id: 'leg_press',          name: 'Leg Press',                   muscleGroup: 'Quads',      loadType: 'weight', isCustom: false },
  { id: 'hack_squat',         name: 'Hack Squat',                  muscleGroup: 'Quads',      loadType: 'weight', isCustom: false },
  { id: 'leg_extension',      name: 'Leg Extension',               muscleGroup: 'Quads',      loadType: 'weight', isCustom: false },
  { id: 'bulgarian_split_squat', name: 'Bulgarian Split Squat',   muscleGroup: 'Quads',      loadType: 'weight', isCustom: false },
  { id: 'lunges',             name: 'Walking Lunges',              muscleGroup: 'Quads',      loadType: 'weight', isCustom: false },
  { id: 'reverse_lunge',      name: 'Reverse Lunge',               muscleGroup: 'Quads',      loadType: 'weight', isCustom: false },
  { id: 'goblet_squat',       name: 'Goblet Squat',                muscleGroup: 'Quads',      loadType: 'weight', isCustom: false },
  { id: 'sissy_squat',        name: 'Sissy Squat',                 muscleGroup: 'Quads',      loadType: 'bw',     isCustom: false },
  { id: 'power_clean',        name: 'Power Clean',                 muscleGroup: 'Quads',      loadType: 'weight', isCustom: false },
  { id: 'hang_clean',         name: 'Hang Clean',                  muscleGroup: 'Quads',      loadType: 'weight', isCustom: false },
  { id: 'clean_jerk',         name: 'Clean & Jerk',                muscleGroup: 'Quads',      loadType: 'weight', isCustom: false },
  { id: 'snatch',             name: 'Snatch',                      muscleGroup: 'Quads',      loadType: 'weight', isCustom: false },
  { id: 'sled_push',          name: 'Sled Push',                   muscleGroup: 'Quads',      loadType: 'weight', isCustom: false },

  // HAMSTRINGS (9)
  { id: 'rdl',                name: 'Romanian Deadlift',           muscleGroup: 'Hamstrings', loadType: 'weight', isCustom: false },
  { id: 'stiff_leg_deadlift', name: 'Stiff-Leg Deadlift',          muscleGroup: 'Hamstrings', loadType: 'weight', isCustom: false },
  { id: 'leg_curl',           name: 'Lying Leg Curl',              muscleGroup: 'Hamstrings', loadType: 'weight', isCustom: false },
  { id: 'seated_leg_curl',    name: 'Seated Leg Curl',             muscleGroup: 'Hamstrings', loadType: 'weight', isCustom: false },
  { id: 'good_mornings',      name: 'Good Mornings',               muscleGroup: 'Hamstrings', loadType: 'weight', isCustom: false },
  { id: 'nordic_curl',        name: 'Nordic Hamstring Curl',       muscleGroup: 'Hamstrings', loadType: 'bw',     isCustom: false },
  { id: 'glute_ham_raise',    name: 'Glute-Ham Raise',             muscleGroup: 'Hamstrings', loadType: 'bw',     isCustom: false },
  { id: 'cable_pull_through', name: 'Cable Pull-Through',          muscleGroup: 'Hamstrings', loadType: 'weight', isCustom: false },
  { id: 'swiss_ball_curl',    name: 'Swiss Ball Leg Curl',         muscleGroup: 'Hamstrings', loadType: 'bw',     isCustom: false },
  { id: 'back_extension',     name: 'Back Extension (45°)',        muscleGroup: 'Hamstrings', loadType: 'weight', isCustom: false },

  // GLUTES (9)
  { id: 'hip_thrust',         name: 'Barbell Hip Thrust',          muscleGroup: 'Glutes',     loadType: 'weight', isCustom: false },
  { id: 'db_hip_thrust',      name: 'Dumbbell Hip Thrust',         muscleGroup: 'Glutes',     loadType: 'weight', isCustom: false },
  { id: 'glute_bridge',       name: 'Glute Bridge',                muscleGroup: 'Glutes',     loadType: 'weight', isCustom: false },
  { id: 'cable_kickback',     name: 'Cable Glute Kickback',        muscleGroup: 'Glutes',     loadType: 'weight', isCustom: false },
  { id: 'step_ups',           name: 'Step-Ups',                    muscleGroup: 'Glutes',     loadType: 'weight', isCustom: false },
  { id: 'sumo_squat',         name: 'Sumo Squat',                  muscleGroup: 'Glutes',     loadType: 'weight', isCustom: false },
  { id: 'hip_abduction',      name: 'Hip Abduction Machine',       muscleGroup: 'Glutes',     loadType: 'weight', isCustom: false },
  { id: 'donkey_kick',        name: 'Donkey Kicks',                muscleGroup: 'Glutes',     loadType: 'bw',     isCustom: false },
  { id: 'kb_swing',           name: 'Kettlebell Swing',            muscleGroup: 'Glutes',     loadType: 'weight', isCustom: false },

  // FRONT DELTS (7)
  { id: 'ohp',                name: 'Overhead Press (Barbell)',    muscleGroup: 'Front Delts', loadType: 'weight', isCustom: false },
  { id: 'db_shoulder_press',  name: 'Dumbbell Shoulder Press',     muscleGroup: 'Front Delts', loadType: 'weight', isCustom: false },
  { id: 'arnold_press',       name: 'Arnold Press',                muscleGroup: 'Front Delts', loadType: 'weight', isCustom: false },
  { id: 'front_raise',        name: 'Dumbbell Front Raise',        muscleGroup: 'Front Delts', loadType: 'weight', isCustom: false },
  { id: 'cable_front_raise',  name: 'Cable Front Raise',           muscleGroup: 'Front Delts', loadType: 'weight', isCustom: false },
  { id: 'push_press',         name: 'Push Press',                  muscleGroup: 'Front Delts', loadType: 'weight', isCustom: false },
  { id: 'machine_shoulder_press', name: 'Machine Shoulder Press',  muscleGroup: 'Front Delts', loadType: 'weight', isCustom: false },

  // SIDE DELTS (5)
  { id: 'lateral_raise',      name: 'Dumbbell Lateral Raise',      muscleGroup: 'Side Delts', loadType: 'weight', isCustom: false },
  { id: 'cable_lateral_raise',name: 'Cable Lateral Raise',         muscleGroup: 'Side Delts', loadType: 'weight', isCustom: false },
  { id: 'machine_lateral_raise', name: 'Machine Lateral Raise',    muscleGroup: 'Side Delts', loadType: 'weight', isCustom: false },
  { id: 'upright_row',        name: 'Barbell Upright Row',         muscleGroup: 'Side Delts', loadType: 'weight', isCustom: false },
  { id: 'db_upright_row',     name: 'Dumbbell Upright Row',        muscleGroup: 'Side Delts', loadType: 'weight', isCustom: false },

  // REAR DELTS (6)
  { id: 'face_pulls',         name: 'Face Pulls',                  muscleGroup: 'Rear Delts', loadType: 'weight', isCustom: false },
  { id: 'rear_delt_fly',      name: 'Rear Delt Fly (Dumbbell)',    muscleGroup: 'Rear Delts', loadType: 'weight', isCustom: false },
  { id: 'reverse_pec_deck',   name: 'Reverse Pec Deck',            muscleGroup: 'Rear Delts', loadType: 'weight', isCustom: false },
  { id: 'cable_rear_delt_fly',name: 'Cable Rear Delt Fly',         muscleGroup: 'Rear Delts', loadType: 'weight', isCustom: false },
  { id: 'band_pull_apart',    name: 'Band Pull-Apart',             muscleGroup: 'Rear Delts', loadType: 'bw',     isCustom: false },
  { id: 'bent_over_lateral',  name: 'Bent-Over Lateral Raise',     muscleGroup: 'Rear Delts', loadType: 'weight', isCustom: false },

  // BICEPS (9)
  { id: 'barbell_curl',       name: 'Barbell Curl',                muscleGroup: 'Biceps',     loadType: 'weight', isCustom: false },
  { id: 'ez_bar_curl',        name: 'EZ-Bar Curl',                 muscleGroup: 'Biceps',     loadType: 'weight', isCustom: false },
  { id: 'db_curl',            name: 'Dumbbell Curl',               muscleGroup: 'Biceps',     loadType: 'weight', isCustom: false },
  { id: 'hammer_curl',        name: 'Hammer Curl',                 muscleGroup: 'Biceps',     loadType: 'weight', isCustom: false },
  { id: 'preacher_curl',      name: 'Preacher Curl',               muscleGroup: 'Biceps',     loadType: 'weight', isCustom: false },
  { id: 'cable_curl',         name: 'Cable Curl',                  muscleGroup: 'Biceps',     loadType: 'weight', isCustom: false },
  { id: 'concentration_curl', name: 'Concentration Curl',          muscleGroup: 'Biceps',     loadType: 'weight', isCustom: false },
  { id: 'incline_db_curl',    name: 'Incline Dumbbell Curl',       muscleGroup: 'Biceps',     loadType: 'weight', isCustom: false },
  { id: 'spider_curl',        name: 'Spider Curl',                 muscleGroup: 'Biceps',     loadType: 'weight', isCustom: false },

  // TRICEPS (9)
  { id: 'close_grip_bench',   name: 'Close-Grip Bench Press',      muscleGroup: 'Triceps',    loadType: 'weight', isCustom: false },
  { id: 'tricep_pushdown',    name: 'Tricep Pushdown (Cable)',      muscleGroup: 'Triceps',    loadType: 'weight', isCustom: false },
  { id: 'overhead_tricep_ext',name: 'Overhead Tricep Extension',   muscleGroup: 'Triceps',    loadType: 'weight', isCustom: false },
  { id: 'skull_crushers',     name: 'Skull Crushers',              muscleGroup: 'Triceps',    loadType: 'weight', isCustom: false },
  { id: 'dips_tricep',        name: 'Dips (Tricep Focused)',        muscleGroup: 'Triceps',    loadType: 'bw',     isCustom: false },
  { id: 'tricep_kickback',    name: 'Tricep Kickback',             muscleGroup: 'Triceps',    loadType: 'weight', isCustom: false },
  { id: 'jm_press',           name: 'JM Press',                    muscleGroup: 'Triceps',    loadType: 'weight', isCustom: false },
  { id: 'overhead_db_ext',    name: 'Overhead Dumbbell Extension', muscleGroup: 'Triceps',    loadType: 'weight', isCustom: false },
  { id: 'diamond_pushup',     name: 'Diamond Push-Ups',            muscleGroup: 'Triceps',    loadType: 'bw',     isCustom: false },

  // FOREARMS (6)
  { id: 'wrist_curl',         name: 'Barbell Wrist Curl',          muscleGroup: 'Forearms',   loadType: 'weight', isCustom: false },
  { id: 'reverse_wrist_curl', name: 'Reverse Wrist Curl',          muscleGroup: 'Forearms',   loadType: 'weight', isCustom: false },
  { id: 'farmers_carry',      name: "Farmer's Carry",              muscleGroup: 'Forearms',   loadType: 'weight', isCustom: false },
  { id: 'dead_hang',          name: 'Dead Hang',                   muscleGroup: 'Forearms',   loadType: 'bw',     isCustom: false },
  { id: 'reverse_curl',       name: 'Reverse Curl',                muscleGroup: 'Forearms',   loadType: 'weight', isCustom: false },
  { id: 'plate_pinch',        name: 'Plate Pinch',                 muscleGroup: 'Forearms',   loadType: 'weight', isCustom: false },

  // CORE (12)
  { id: 'plank',              name: 'Plank',                       muscleGroup: 'Core',       loadType: 'bw',     isCustom: false },
  { id: 'ab_wheel',           name: 'Ab Wheel Rollout',            muscleGroup: 'Core',       loadType: 'bw',     isCustom: false },
  { id: 'hanging_leg_raise',  name: 'Hanging Leg Raise',           muscleGroup: 'Core',       loadType: 'bw',     isCustom: false },
  { id: 'cable_crunch',       name: 'Cable Crunch',                muscleGroup: 'Core',       loadType: 'weight', isCustom: false },
  { id: 'russian_twist',      name: 'Russian Twist',               muscleGroup: 'Core',       loadType: 'weight', isCustom: false },
  { id: 'pallof_press',       name: 'Pallof Press',                muscleGroup: 'Core',       loadType: 'weight', isCustom: false },
  { id: 'dragon_flag',        name: 'Dragon Flag',                 muscleGroup: 'Core',       loadType: 'bw',     isCustom: false },
  { id: 'hollow_body',        name: 'Hollow Body Hold',            muscleGroup: 'Core',       loadType: 'bw',     isCustom: false },
  { id: 'decline_situp',      name: 'Decline Sit-Up',              muscleGroup: 'Core',       loadType: 'bw',     isCustom: false },
  { id: 'bicycle_crunch',     name: 'Bicycle Crunch',              muscleGroup: 'Core',       loadType: 'bw',     isCustom: false },
  { id: 'side_plank',         name: 'Side Plank',                  muscleGroup: 'Core',       loadType: 'bw',     isCustom: false },
  { id: 'toes_to_bar',        name: 'Toes-to-Bar',                 muscleGroup: 'Core',       loadType: 'bw',     isCustom: false },
  { id: 'cable_woodchopper',  name: 'Cable Woodchopper',           muscleGroup: 'Core',       loadType: 'weight', isCustom: false },

  // CALVES (5)
  { id: 'standing_calf_raise',name: 'Standing Calf Raise',         muscleGroup: 'Calves',     loadType: 'weight', isCustom: false },
  { id: 'seated_calf_raise',  name: 'Seated Calf Raise',           muscleGroup: 'Calves',     loadType: 'weight', isCustom: false },
  { id: 'calf_press',         name: 'Calf Press (Leg Press Machine)', muscleGroup: 'Calves',  loadType: 'weight', isCustom: false },
  { id: 'single_leg_calf_raise', name: 'Single-Leg Calf Raise',    muscleGroup: 'Calves',     loadType: 'bw',     isCustom: false },
  { id: 'donkey_calf_raise',  name: 'Donkey Calf Raise',           muscleGroup: 'Calves',     loadType: 'weight', isCustom: false },
];

// 7-category order used by the progress charts (legacy system, unchanged)
export const MUSCLE_GROUP_ORDER = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core'];

export const MUSCLE_GROUP_META = {
  chest:     { label: 'Chest',     color: '#e8572a' },
  back:      { label: 'Back',      color: '#1a8fe0' },
  shoulders: { label: 'Shoulders', color: '#7c4dff' },
  biceps:    { label: 'Biceps',    color: '#16a34a' },
  triceps:   { label: 'Triceps',   color: '#db2777' },
  legs:      { label: 'Legs',      color: '#0fa678' },
  core:      { label: 'Core',      color: '#d97706' },
  other:     { label: 'Other',     color: '#5f6b7d' }
};

export function getExerciseById(id) {
  return EXERCISE_LIBRARY.find(ex => ex.id === id);
}

export function getExercisesByMuscleGroup(muscleGroup) {
  return EXERCISE_LIBRARY.filter(ex => ex.muscleGroup === muscleGroup);
}

export function searchExercises(query) {
  const q = query.toLowerCase();
  return EXERCISE_LIBRARY.filter(ex => ex.name.toLowerCase().includes(q));
}
