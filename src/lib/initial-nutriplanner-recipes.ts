import type { Recipe } from './types';

export const initialNutriplannerRecipes: Omit<Recipe, 'id'>[] = [
  // Desayunos (10)
  {
    name: 'Tostada con Aguacate y Huevo',
    description: 'Un desayuno clásico, nutritivo y rápido de preparar.',
    instructions: '1. Tostar el pan. 2. Machacar el aguacate y untarlo en la tostada. 3. Cocinar un huevo a la plancha o poché y colocarlo encima. 4. Sazonar con sal, pimienta y un poco de chile en copos.',
    calories: 350,
    protein: 15,
    carbs: 25,
    fat: 20,
    ingredients: [
      { id: 'ing-pan-integral', name: 'Pan integral de trigo', quantity: 80, unit: 'g', calories: 206, protein: 6.4, carbs: 39.2, fat: 1.12 },
      { id: 'ing-aguacate', name: 'Aguacate', quantity: 50, unit: 'g', calories: 70.5, protein: 0.75, carbs: 2.95, fat: 6 },
      { id: 'ing-huevo', name: 'Huevo de gallina', quantity: 60, unit: 'g', calories: 90, protein: 7.5, carbs: 0, fat: 6.66 }
    ]
  },
  {
    name: 'Batido de Proteínas con Frutos Rojos',
    description: 'Un batido post-entrenamiento perfecto para la recuperación muscular.',
    instructions: '1. Añadir todos los ingredientes a la batidora. 2. Batir hasta conseguir una mezcla homogénea. 3. Servir inmediatamente.',
    calories: 400,
    protein: 35,
    carbs: 45,
    fat: 8,
    ingredients: [
      { id: 'ing-proteina-vainilla', name: 'Proteína en polvo', quantity: 30, unit: 'g', calories: 120, protein: 25, carbs: 2, fat: 1.5 },
      { id: 'ing-frutos-rojos', name: 'Arándano', quantity: 150, unit: 'g', calories: 63, protein: 0.9, carbs: 9.15, fat: 0.9 },
      { id: 'ing-platano', name: 'Plátano', quantity: 100, unit: 'g', calories: 94, protein: 1.2, carbs: 20, fat: 0.3 },
      { id: 'ing-leche-almendras', name: 'Leche de almendras', quantity: 200, unit: 'ml', calories: 30, protein: 1, carbs: 1, fat: 2.5 }
    ]
  },
  {
    name: 'Avena Nocturna con Chía y Mango',
    description: 'Prepara tu desayuno la noche anterior y despierta con una delicia lista para comer.',
    instructions: '1. En un frasco, mezclar la avena, las semillas de chía, la leche y el yogur. 2. Remover bien y dejar reposar en la nevera toda la noche. 3. Por la mañana, añadir el mango troceado y las nueces por encima.',
    calories: 450,
    protein: 20,
    carbs: 60,
    fat: 15,
    ingredients: [
      { id: 'ing-avena', name: 'Avena', quantity: 50, unit: 'g', calories: 180, protein: 5.85, carbs: 29.9, fat: 3.55 },
      { id: 'ing-chia', name: 'Semillas de chía', quantity: 15, unit: 'g', calories: 73, protein: 2.5, carbs: 6.3, fat: 4.6 },
      { id: 'ing-leche-desnatada', name: 'Leche de vaca desnatada', quantity: 150, unit: 'ml', calories: 52, protein: 5.1, carbs: 7.5, fat: 0.15 },
      { id: 'ing-yogur-griego', name: 'Yogur griego', quantity: 50, unit: 'g', calories: 70, protein: 3.2, carbs: 2.7, fat: 5.1 },
      { id: 'ing-mango', name: 'Mango', quantity: 100, unit: 'g', calories: 67, protein: 0.7, carbs: 14.1, fat: 0.2 }
    ]
  },
  {
    name: 'Revuelto de Tofu con Cúrcuma',
    description: 'Una alternativa vegana y sabrosa al huevo revuelto.',
    instructions: '1. Desmenuzar el tofu con un tenedor. 2. Saltear en una sartén con un poco de aceite. 3. Añadir la cúrcuma, la levadura nutricional, sal y pimienta. 4. Cocinar unos minutos y servir con espinacas frescas.',
    calories: 300,
    protein: 25,
    carbs: 10,
    fat: 18,
    ingredients: [
      { id: 'ing-tofu', name: 'Tofu', quantity: 150, unit: 'g', calories: 111, protein: 12.15, carbs: 1.05, fat: 6.3 },
      { id: 'ing-curcuma', name: 'Cúrcuma', quantity: 2, unit: 'g', calories: 6, protein: 0.2, carbs: 1.3, fat: 0.2 },
      { id: 'ing-levadura-nutricional', name: 'Levadura de cerveza', quantity: 5, unit: 'g', calories: 20, protein: 2.5, carbs: 2, fat: 0.2 },
      { id: 'ing-espinacas', name: 'Espinacas', quantity: 50, unit: 'g', calories: 15, protein: 1.3, carbs: 0.6, fat: 0.15 }
    ]
  },
  {
    name: 'Yogur Griego con Nueces y Miel',
    description: 'Un desayuno simple, cremoso y lleno de energía.',
    instructions: '1. Poner el yogur griego en un bol. 2. Añadir las nueces troceadas por encima. 3. Rociar con un hilo de miel.',
    calories: 380,
    protein: 15,
    carbs: 25,
    fat: 25,
    ingredients: [
      { id: 'ing-yogur-griego', name: 'Yogur griego', quantity: 150, unit: 'g', calories: 208.5, protein: 9.6, carbs: 8.1, fat: 15.3 },
      { id: 'ing-nueces', name: 'Nueces sin cascara', quantity: 30, unit: 'g', calories: 183, protein: 4.2, carbs: 0.99, fat: 17.7 },
      { id: 'ing-miel', name: 'Miel', quantity: 10, unit: 'g', calories: 31.4, protein: 0.05, carbs: 7.8, fat: 0 }
    ]
  },
    {
    name: 'Tostadas Francesas Fitness',
    description: 'La versión saludable de un clásico, alta en proteínas.',
    instructions: '1. Batir las claras de huevo con canela. 2. Empapar las rebanadas de pan en la mezcla. 3. Cocinar en una sartén antiadherente hasta que estén doradas. 4. Servir con rodajas de plátano.',
    calories: 420,
    protein: 25,
    carbs: 65,
    fat: 5,
    ingredients: [
      { id: 'ing-pan-integral', name: 'Pan integral de trigo', quantity: 100, unit: 'g', calories: 258, protein: 8, carbs: 49, fat: 1.4 },
      { id: 'ing-claras-huevo', name: 'Clara de huevo', quantity: 100, unit: 'g', calories: 49, protein: 11, carbs: 0.7, fat: 0.2 },
      { id: 'ing-canela', name: 'Canela molida', quantity: 2, unit: 'g', calories: 0.88, protein: 0.08, carbs: 0.06, fat: 0.06 },
      { id: 'ing-platano', name: 'Plátano', quantity: 100, unit: 'g', calories: 94, protein: 1.2, carbs: 20, fat: 0.3 }
    ]
  },
  {
    name: 'Muffins de Huevo y Verduras',
    description: 'Perfectos para preparar el fin de semana y tener un desayuno listo para llevar.',
    instructions: '1. Batir los huevos. 2. Picar finamente las verduras y añadirlas al huevo. 3. Verter la mezcla en moldes para muffins. 4. Hornear a 180°C durante 15-20 minutos.',
    calories: 250,
    protein: 20,
    carbs: 8,
    fat: 15,
    ingredients: [
      { id: 'ing-huevo', name: 'Huevo de gallina', quantity: 120, unit: 'g', calories: 180, protein: 15, carbs: 0, fat: 13.32 },
      { id: 'ing-pimiento-rojo', name: 'Pimiento rojo', quantity: 50, unit: 'g', calories: 18.5, protein: 0.5, carbs: 3.2, fat: 0.2 },
      { id: 'ing-espinacas', name: 'Espinacas', quantity: 50, unit: 'g', calories: 15.5, protein: 1.3, carbs: 0.6, fat: 0.15 },
      { id: 'ing-queso-feta', name: 'Queso Feta', quantity: 20, unit: 'g', calories: 51, protein: 2.84, carbs: 0.82, fat: 4.26 }
    ]
  },
  {
    name: 'Crepes de Avena y Plátano',
    description: 'Crepes sin harina y sin azúcar añadido, naturalmente dulces.',
    instructions: '1. Batir la avena, el plátano y los huevos hasta obtener una masa. 2. Verter porciones en una sartén caliente. 3. Cocinar por ambos lados y servir.',
    calories: 380,
    protein: 18,
    carbs: 55,
    fat: 10,
    ingredients: [
      { id: 'ing-avena', name: 'Avena', quantity: 50, unit: 'g', calories: 180.5, protein: 5.85, carbs: 29.9, fat: 3.55 },
      { id: 'ing-platano', name: 'Plátano', quantity: 100, unit: 'g', calories: 94, protein: 1.2, carbs: 20, fat: 0.3 },
      { id: 'ing-huevo', name: 'Huevo de gallina', quantity: 60, unit: 'g', calories: 90, protein: 7.5, carbs: 0, fat: 6.66 }
    ]
  },
  {
    name: 'Queso Cottage con Melocotón y Almendras',
    description: 'Un desayuno proteico, fresco y crujiente.',
    instructions: '1. Poner el queso cottage en un bol. 2. Cortar el melocotón en dados y añadirlo. 3. Espolvorear con almendras laminadas.',
    calories: 320,
    protein: 25,
    carbs: 20,
    fat: 15,
    ingredients: [
      { id: 'ing-queso-cottage', name: 'Queso Cottage', quantity: 150, unit: 'g', calories: 150, protein: 21, carbs: 4.5, fat: 5 },
      { id: 'ing-melocoton', name: 'Melocotón', quantity: 150, unit: 'g', calories: 61.5, protein: 0.9, carbs: 13.5, fat: 0 },
      { id: 'ing-almendras', name: 'Almendra sin cáscara', quantity: 20, unit: 'g', calories: 120.8, protein: 3.8, carbs: 0.9, fat: 10.7 }
    ]
  },
  {
    name: 'Tostada con Crema de Cacahuete y Rodajas de Manzana',
    description: 'Una combinación de dulce y salado llena de fibra y grasas saludables.',
    instructions: '1. Tostar el pan. 2. Untar la crema de cacahuete. 3. Colocar las rodajas de manzana por encima.',
    calories: 400,
    protein: 15,
    carbs: 45,
    fat: 20,
    ingredients: [
      { id: 'ing-pan-integral', name: 'Pan integral de trigo', quantity: 80, unit: 'g', calories: 206.4, protein: 6.4, carbs: 39.2, fat: 1.12 },
      { id: 'ing-crema-cacahuete', name: 'Crema de cacahuete', quantity: 30, unit: 'g', calories: 185.7, protein: 7.65, carbs: 3.36, fat: 15.27 },
      { id: 'ing-manzana', name: 'Manzana', quantity: 100, unit: 'g', calories: 53, protein: 0.3, carbs: 12, fat: 0 }
    ]
  },

  // Almuerzos (10)
  {
    name: 'Ensalada César con Pollo a la Plancha',
    description: 'La clásica ensalada César, pero más ligera y con un buen aporte de proteínas.',
    instructions: '1. Cocinar la pechuga de pollo a la plancha y cortarla en tiras. 2. Lavar y cortar la lechuga. 3. Mezclar con el pollo, los picatostes y el queso parmesano. 4. Aliñar con la salsa César.',
    calories: 550,
    protein: 45,
    carbs: 20,
    fat: 30,
    ingredients: [
      { id: 'ing-pollo', name: 'Pechuga de Pollo', quantity: 150, unit: 'g', calories: 195, protein: 37.5, carbs: 0, fat: 4.5 },
      { id: 'ing-lechuga-romana', name: 'Lechuga romana', quantity: 100, unit: 'g', calories: 18.2, protein: 1, carbs: 1.28, fat: 0.6 },
      { id: 'ing-picatostes', name: 'Picatostes', quantity: 30, unit: 'g', calories: 92.4, protein: 3.03, carbs: 17.37, fat: 0.89 },
      { id: 'ing-parmesano', name: 'Queso parmesano', quantity: 20, unit: 'g', calories: 84, protein: 8, carbs: 0, fat: 5.78 },
      { id: 'ing-salsa-cesar', name: 'Salsa césar', quantity: 30, unit: 'g', calories: 163.2, protein: 0.66, carbs: 0.99, fat: 17.35 }
    ]
  },
  {
    name: 'Salmón al Horno con Espárragos',
    description: 'Una comida rica en Omega-3, deliciosa y muy fácil de preparar.',
    instructions: '1. Precalentar el horno a 200°C. 2. Colocar el salmón y los espárragos en una bandeja de horno. 3. Rociar con aceite de oliva, sal, pimienta y rodajas de limón. 4. Hornear durante 12-15 minutos.',
    calories: 450,
    protein: 35,
    carbs: 10,
    fat: 28,
    ingredients: [
      { id: 'ing-salmon', name: 'Salmón', quantity: 150, unit: 'g', calories: 273, protein: 27.6, carbs: 0, fat: 18 },
      { id: 'ing-esparragos', name: 'Espárrago verde fresco', quantity: 200, unit: 'g', calories: 56, protein: 5.8, carbs: 4, fat: 1.2 },
      { id: 'ing-aceite-oliva', name: 'Aceite de oliva', quantity: 10, unit: 'ml', calories: 89.9, protein: 0, carbs: 0, fat: 9.99 },
      { id: 'ing-limon', name: 'Limón', quantity: 30, unit: 'g', calories: 13.2, protein: 0.21, carbs: 2.7, fat: 0.12 }
    ]
  },
  {
    name: 'Lentejas Estofadas con Verduras',
    description: 'Un plato de cuchara tradicional, reconfortante y lleno de nutrientes.',
    instructions: '1. Sofreír ajo, cebolla, pimiento y zanahoria. 2. Añadir las lentejas (previamente remojadas si son secas), cubrir con agua o caldo y añadir una hoja de laurel. 3. Cocer a fuego lento durante 45-60 minutos hasta que estén tiernas. 4. Sazonar al gusto.',
    calories: 500,
    protein: 25,
    carbs: 80,
    fat: 8,
    ingredients: [
      { id: 'ing-lentejas', name: 'Lenteja', quantity: 100, unit: 'g', calories: 351, protein: 23.8, carbs: 54, fat: 1.8 },
      { id: 'ing-zanahoria', name: 'Zanahoria', quantity: 50, unit: 'g', calories: 20, protein: 0.45, carbs: 3.65, fat: 0.1 },
      { id: 'ing-cebolla', name: 'Cebollas blanca', quantity: 50, unit: 'g', calories: 11.5, protein: 0.7, carbs: 1.75, fat: 0.1 },
      { id: 'ing-pimiento-verde', name: 'Pimiento verde', quantity: 50, unit: 'g', calories: 11.5, protein: 0.45, carbs: 1.85, fat: 0.1 },
      { id: 'ing-aceite-oliva', name: 'Aceite de oliva', quantity: 10, unit: 'ml', calories: 89.9, protein: 0, carbs: 0, fat: 9.99 }
    ]
  },
  {
    name: 'Bowl de Quinoa con Garbanzos y Aguacate',
    description: 'Un almuerzo vegano completo, lleno de color y sabor.',
    instructions: '1. Cocer la quinoa según las instrucciones. 2. En un bol, mezclar la quinoa cocida, los garbanzos, el maíz, el tomate en cubos, el aguacate en cubos y el cilantro picado. 3. Aliñar con zumo de lima, aceite de oliva, sal y pimienta.',
    calories: 600,
    protein: 20,
    carbs: 70,
    fat: 28,
    ingredients: [
      { id: 'ing-quinoa', name: 'Quinoa', quantity: 80, unit: 'g', calories: 254.4, protein: 11.04, carbs: 39.36, fat: 4.48 },
      { id: 'ing-garbanzos', name: 'Garbanzo', quantity: 100, unit: 'g', calories: 373, protein: 19.4, carbs: 55, fat: 5 },
      { id: 'ing-aguacate', name: 'Aguacate', quantity: 50, unit: 'g', calories: 70.5, protein: 0.75, carbs: 2.95, fat: 6 },
      { id: 'ing-tomate', name: 'Tomate', quantity: 100, unit: 'g', calories: 22, protein: 1, carbs: 3.5, fat: 0.11 }
    ]
  },
  {
    name: 'Pechuga de Pavo al Curry con Arroz Basmati',
    description: 'Un plato exótico, aromático y con un toque picante.',
    instructions: '1. Cortar la pechuga de pavo en dados y dorarla en una sartén. 2. Añadir cebolla picada y saltear. 3. Incorporar leche de coco, curry en polvo, sal y pimienta. 4. Cocer a fuego lento durante 15 minutos. 5. Servir con arroz basmati cocido.',
    calories: 550,
    protein: 40,
    carbs: 55,
    fat: 18,
    ingredients: [
      { id: 'ing-pavo', name: 'Pavo, pechuga sin piel', quantity: 180, unit: 'g', calories: 180, protein: 39.42, carbs: 0, fat: 2.52 },
      { id: 'ing-leche-coco', name: 'coco, leche', quantity: 100, unit: 'ml', calories: 241, protein: 2.3, carbs: 3.3, fat: 23.8 },
      { id: 'ing-arroz-blanco', name: 'Arroz blanco', quantity: 60, unit: 'g', calories: 228.6, protein: 4.2, carbs: 51.6, fat: 0.54 },
      { id: 'ing-curry', name: 'Curri', quantity: 5, unit: 'g', calories: 21.75, protein: 0.75, carbs: 3, fat: 0.75 }
    ]
  },
    {
    name: 'Wraps de Hummus con Verduras Asadas',
    description: 'Un almuerzo vegetariano, fácil de transportar y delicioso.',
    instructions: '1. Cortar pimiento, calabacín y berenjena en tiras y asarlos en el horno o a la plancha. 2. Calentar las tortillas. 3. Untar una capa generosa de hummus en cada tortilla. 4. Rellenar con las verduras asadas y hojas de rúcula. 5. Enrollar y servir.',
    calories: 450,
    protein: 15,
    carbs: 60,
    fat: 18,
    ingredients: [
      { id: 'ing-tortilla-trigo', name: 'Tortitas de harina trigo para burritos listas para hornear o freír', quantity: 100, unit: 'g', calories: 332, protein: 8.7, carbs: 56.6, fat: 7.1 },
      { id: 'ing-hummus', name: 'Hummus', quantity: 50, unit: 'g', calories: 166, protein: 4, carbs: 7, fat: 12.5 },
      { id: 'ing-pimiento-rojo', name: 'Pimiento rojo', quantity: 100, unit: 'g', calories: 37, protein: 1, carbs: 6.4, fat: 0.4 },
      { id: 'ing-calabacin', name: 'Calabacín', quantity: 100, unit: 'g', calories: 14, protein: 0.6, carbs: 2.2, fat: 0.2 }
    ]
  },
  {
    name: 'Solomillo de Cerdo a la Naranja',
    description: 'Una carne tierna con una salsa agridulce que sorprende.',
    instructions: '1. Dorar el solomillo de cerdo entero en una sartén y reservar. 2. En la misma sartén, pochar cebolla y ajo. 3. Añadir zumo de naranja, un poco de salsa de soja y una cucharadita de miel. 4. Reincorporar el solomillo y cocer a fuego lento hasta que esté hecho. 5. Servir fileteado con su salsa.',
    calories: 480,
    protein: 45,
    carbs: 20,
    fat: 22,
    ingredients: [
      { id: 'ing-solomillo-cerdo', name: 'Cerdo, solomillo', quantity: 200, unit: 'g', calories: 260, protein: 42, carbs: 0, fat: 10.2 },
      { id: 'ing-naranja', name: 'Naranja', quantity: 150, unit: 'g', calories: 63, protein: 1.2, carbs: 12.9, fat: 0 },
      { id: 'ing-salsa-soja', name: 'Salsa de soja', quantity: 15, unit: 'ml', calories: 9.9, protein: 1.3, carbs: 1, fat: 0.015 },
      { id: 'ing-aceite-oliva', name: 'Aceite de oliva', quantity: 10, unit: 'ml', calories: 89.9, protein: 0, carbs: 0, fat: 9.99 }
    ]
  },
  {
    name: 'Pasta Integral con Pesto de Rúcula y Tomates Secos',
    description: 'Una versión diferente y sabrosa del pesto tradicional.',
    instructions: '1. Cocer la pasta según las indicaciones. 2. Para el pesto, triturar rúcula, nueces, ajo, queso parmesano y aceite de oliva. 3. Escurrir la pasta y mezclarla con el pesto y los tomates secos picados.',
    calories: 650,
    protein: 25,
    carbs: 85,
    fat: 25,
    ingredients: [
      { id: 'ing-pasta-integral', name: 'Pasta integral', quantity: 100, unit: 'g', calories: 353, protein: 13.1, carbs: 63.7, fat: 2.9 },
      { id: 'ing-rucula', name: 'Rúcula', quantity: 50, unit: 'g', calories: 17, protein: 1.3, carbs: 1.85, fat: 0.33 },
      { id: 'ing-tomates-secos', name: 'Tomate seco', quantity: 30, unit: 'g', calories: 77, protein: 4.2, carbs: 10.5, fat: 0.9 },
      { id: 'ing-nueces', name: 'Nueces sin cascara', quantity: 20, unit: 'g', calories: 122.2, protein: 2.8, carbs: 0.66, fat: 11.8 }
    ]
  },
  {
    name: 'Ternera Salteada con Brócoli y Anacardos',
    description: 'Un salteado rápido de inspiración asiática, crujiente y lleno de sabor.',
    instructions: '1. Cortar la ternera en tiras finas. 2. Saltear en un wok o sartén grande con aceite caliente hasta que se dore. 3. Añadir el brócoli y cocinar unos minutos. 4. Incorporar salsa de soja, un poco de jengibre rallado y los anacardos. 5. Cocinar todo junto 2-3 minutos más y servir.',
    calories: 580,
    protein: 40,
    carbs: 30,
    fat: 35,
    ingredients: [
      { id: 'ing-ternera', name: 'Ternera, carne magra', quantity: 150, unit: 'g', calories: 196.5, protein: 31.05, carbs: 0, fat: 8.1 },
      { id: 'ing-brocoli', name: 'Brecol', quantity: 200, unit: 'g', calories: 76, protein: 8.8, carbs: 3.6, fat: 1.8 },
      { id: 'ing-anacardos', name: 'Anacardo sin cáscara', quantity: 30, unit: 'g', calories: 175.2, protein: 5.25, carbs: 9.6, fat: 12.66 },
      { id: 'ing-salsa-soja', name: 'Salsa de soja', quantity: 20, unit: 'ml', calories: 13.2, protein: 1.74, carbs: 1.34, fat: 0.02 }
    ]
  },
  {
    name: 'Merluza en Salsa Verde',
    description: 'Un plato clásico de la cocina española, ligero y muy sabroso.',
    instructions: '1. En una cazuela ancha, pochar ajo picado en aceite de oliva. 2. Añadir una cucharada de harina y remover. 3. Incorporar vino blanco y caldo de pescado. 4. Colocar los lomos de merluza, añadir perejil picado y almejas (opcional). 5. Cocer a fuego suave durante 10-12 minutos.',
    calories: 400,
    protein: 35,
    carbs: 15,
    fat: 20,
    ingredients: [
      { id: 'ing-merluza', name: 'Merluza', quantity: 200, unit: 'g', calories: 178, protein: 31.8, carbs: 0, fat: 5.6 },
      { id: 'ing-aceite-oliva', name: 'Aceite de oliva', quantity: 15, unit: 'ml', calories: 134.85, protein: 0, carbs: 0, fat: 14.98 },
      { id: 'ing-ajo', name: 'Ajo', quantity: 10, unit: 'g', calories: 11.8, protein: 0.53, carbs: 2.3, fat: 0.03 },
      { id: 'ing-vino-blanco', name: 'Vino blanco', quantity: 50, unit: 'ml', calories: 41.5, protein: 0.05, carbs: 1.3, fat: 0 }
    ]
  },

  // Meriendas (10)
  {
    name: 'Manzana con Crema de Cacahuete',
    description: 'Un snack simple que combina dulce y salado, con fibra y grasas saludables.',
    calories: 280,
    protein: 8,
    carbs: 25,
    fat: 16,
    instructions: '1. Cortar una manzana en gajos. 2. Servir con una cucharada de crema de cacahuete para untar.',
    ingredients: [
      { id: 'ing-manzana', name: 'Manzana', quantity: 150, unit: 'g', calories: 79.5, protein: 0.45, carbs: 18, fat: 0 },
      { id: 'ing-crema-cacahuete', name: 'Crema de cacahuete', quantity: 30, unit: 'g', calories: 185.7, protein: 7.65, carbs: 3.36, fat: 15.27 }
    ]
  },
  {
    name: 'Puñado de Almendras',
    description: 'Un snack rápido, saciante y lleno de nutrientes.',
    calories: 180,
    protein: 6,
    carbs: 6,
    fat: 15,
    instructions: 'Tomar un puñado de aproximadamente 30 gramos de almendras crudas o tostadas sin sal.',
    ingredients: [
      { id: 'ing-almendras', name: 'Almendra sin cáscara', quantity: 30, unit: 'g', calories: 181.2, protein: 5.7, carbs: 1.35, fat: 16.05 }
    ]
  },
  {
    name: 'Yogur Natural con Frutos Rojos',
    description: 'Una merienda ligera, rica en probióticos y antioxidantes.',
    calories: 150,
    protein: 10,
    carbs: 15,
    fat: 5,
    instructions: '1. Poner un yogur natural entero en un bol. 2. Añadir un puñado de frutos rojos frescos o congelados.',
    ingredients: [
      { id: 'ing-yogur-natural', name: 'Yogur entero natural', quantity: 125, unit: 'g', calories: 71.25, protein: 4.62, carbs: 5.5, fat: 3.37 },
      { id: 'ing-frutos-rojos', name: 'Arándano', quantity: 80, unit: 'g', calories: 33.6, protein: 0.48, carbs: 4.88, fat: 0.48 }
    ]
  },
  {
    name: 'Palitos de Zanahoria con Hummus',
    description: 'Crujiente, fresco y perfecto para calmar el hambre de media tarde.',
    calories: 200,
    protein: 6,
    carbs: 20,
    fat: 10,
    instructions: '1. Cortar una zanahoria grande en bastones. 2. Servir con una porción de hummus.',
    ingredients: [
      { id: 'ing-zanahoria', name: 'Zanahoria', quantity: 150, unit: 'g', calories: 60, protein: 1.35, carbs: 10.95, fat: 0.3 },
      { id: 'ing-hummus', name: 'Hummus', quantity: 50, unit: 'g', calories: 166, protein: 4, carbs: 7, fat: 12.5 }
    ]
  },
  {
    name: 'Huevo Duro',
    description: 'Una fuente de proteína de alta calidad, fácil de preparar y transportar.',
    calories: 80,
    protein: 7,
    carbs: 0.5,
    fat: 5,
    instructions: '1. Cocer un huevo en agua hirviendo durante 10-12 minutos. 2. Pelar y sazonar con una pizca de sal.',
    ingredients: [
      { id: 'ing-huevo', name: 'Huevo de gallina', quantity: 50, unit: 'g', calories: 75, protein: 6.25, carbs: 0, fat: 5.55 }
    ]
  },
  {
    name: 'Requesón con Piña',
    description: 'Combinación alta en proteínas y con el dulzor de la fruta.',
    calories: 180,
    protein: 20,
    carbs: 15,
    fat: 4,
    instructions: '1. Servir una porción de requesón en un bol. 2. Añadir trozos de piña natural o en su jugo.',
    ingredients: [
      { id: 'ing-requeson', name: 'Requesón', quantity: 150, unit: 'g', calories: 147, protein: 20.4, carbs: 2.7, fat: 6 },
      { id: 'ing-pina', name: 'Piña', quantity: 100, unit: 'g', calories: 50, protein: 0.5, carbs: 11.5, fat: 0 }
    ]
  },
  {
    name: 'Edamames al Vapor con Sal',
    description: 'Un snack adictivo, divertido de comer y muy saludable.',
    calories: 150,
    protein: 12,
    carbs: 10,
    fat: 5,
    instructions: '1. Cocer los edamames al vapor durante 5-7 minutos. 2. Escurrir y espolvorear con sal gruesa.',
    ingredients: [
      { id: 'ing-edamame', name: 'Soja, brotes, en conserva', quantity: 120, unit: 'g', calories: 146.4, protein: 13.2, carbs: 11.28, fat: 6 }
    ]
  },
  {
    name: 'Chocolate Negro (85%)',
    description: 'Un capricho antioxidante y beneficioso para el estado de ánimo.',
    calories: 170,
    protein: 2,
    carbs: 12,
    fat: 12,
    instructions: 'Disfrutar de dos onzas (aprox. 30g) de chocolate negro con alto porcentaje de cacao.',
    ingredients: [
      { id: 'ing-choco-negro', name: 'Chocolate negro (70%-85% cacao)', quantity: 30, unit: 'g', calories: 186, protein: 2.34, carbs: 13.77, fat: 12.78 }
    ]
  },
  {
    name: 'Tortitas de Arroz con Aguacate',
    description: 'Una merienda ligera y crujiente con el aporte de grasas saludables del aguacate.',
    calories: 220,
    protein: 4,
    carbs: 20,
    fat: 14,
    instructions: '1. Coger dos tortitas de arroz. 2. Untar aguacate machacado por encima. 3. Sazonar con sal y pimienta.',
    ingredients: [
      { id: 'ing-tortitas-arroz', name: 'Tortas de maíz', quantity: 20, unit: 'g', calories: 77.2, protein: 1.6, carbs: 17, fat: 0.4 },
      { id: 'ing-aguacate', name: 'Aguacate', quantity: 80, unit: 'g', calories: 112.8, protein: 1.2, carbs: 4.72, fat: 9.6 }
    ]
  },
  {
    name: 'Batido de Yogur y Mango',
    description: 'Refrescante, cremoso y lleno de vitaminas.',
    calories: 250,
    protein: 10,
    carbs: 40,
    fat: 5,
    instructions: '1. Batir yogur natural, mango troceado y un chorrito de leche. 2. Servir frío.',
    ingredients: [
      { id: 'ing-yogur-natural', name: 'Yogur entero natural', quantity: 125, unit: 'g', calories: 71.25, protein: 4.62, carbs: 5.5, fat: 3.37 },
      { id: 'ing-mango', name: 'Mango', quantity: 150, unit: 'g', calories: 100.5, protein: 1.05, carbs: 21.15, fat: 0.3 },
      { id: 'ing-leche-semi', name: 'Leche de vaca semidesnatada', quantity: 100, unit: 'ml', calories: 43, protein: 3, carbs: 4.4, fat: 1.5 }
    ]
  },

  // Cenas (10)
  {
    name: 'Crema de Calabacín y Quesito',
    description: 'Una cena ligera, reconfortante y muy fácil de digerir.',
    calories: 300,
    protein: 10,
    carbs: 20,
    fat: 20,
    instructions: '1. Sofreír puerro y calabacín troceado. 2. Cubrir con agua o caldo y cocer 20 min. 3. Añadir quesitos en porciones y triturar hasta obtener una crema fina. 4. Sazonar y servir.',
    ingredients: [
      { id: 'ing-calabacin', name: 'Calabacín', quantity: 300, unit: 'g', calories: 42, protein: 1.8, carbs: 6.6, fat: 0.6 },
      { id: 'ing-puerro', name: 'Puerro', quantity: 100, unit: 'g', calories: 48, protein: 2, carbs: 7.5, fat: 0.4 },
      { id: 'ing-quesitos', name: 'Queso en porciones', quantity: 50, unit: 'g', calories: 156, protein: 9, carbs: 1.25, fat: 12.75 },
      { id: 'ing-aceite-oliva', name: 'Aceite de oliva', quantity: 5, unit: 'ml', calories: 44.95, protein: 0, carbs: 0, fat: 4.99 }
    ]
  },
  {
    name: 'Dorada a la Sal',
    description: 'Un método de cocción que deja el pescado increíblemente jugoso y sabroso.',
    instructions: '1. Precalentar horno a 200°C. 2. En una bandeja, poner una cama de sal gorda. 3. Colocar la dorada limpia encima y cubrirla completamente con más sal, humedeciéndola ligeramente. 4. Hornear 25-30 min. 5. Romper la costra de sal, retirar la piel y servir los lomos.',
    calories: 350,
    protein: 40,
    carbs: 0,
    fat: 20,
    ingredients: [
      { id: 'ing-dorada', name: 'Dorada', quantity: 250, unit: 'g', calories: 192.5, protein: 42.5, carbs: 0, fat: 2.5 },
      { id: 'ing-aceite-oliva', name: 'Aceite de oliva', quantity: 15, unit: 'ml', calories: 134.85, protein: 0, carbs: 0, fat: 14.98 }
    ]
  },
  {
    name: 'Revuelto de Champiñones, Gambas y Ajo',
    description: 'Una cena rápida, llena de sabor y muy baja en carbohidratos.',
    instructions: '1. Saltear ajos laminados en una sartén con aceite. 2. Añadir los champiñones laminados y cocinar hasta que suelten el agua. 3. Incorporar las gambas peladas y cocinar hasta que cambien de color. 4. Añadir huevos batidos y remover hasta que cuajen al gusto.',
    calories: 400,
    protein: 35,
    carbs: 5,
    fat: 25,
    ingredients: [
      { id: 'ing-champi', name: 'Champiñon', quantity: 200, unit: 'g', calories: 62, protein: 3.6, carbs: 8, fat: 0.6 },
      { id: 'ing-gambas', name: 'Gambas', quantity: 100, unit: 'g', calories: 93, protein: 20.1, carbs: 0, fat: 1.4 },
      { id: 'ing-huevo', name: 'Huevo de gallina', quantity: 120, unit: 'g', calories: 180, protein: 15, carbs: 0, fat: 13.32 },
      { id: 'ing-aceite-oliva', name: 'Aceite de oliva', quantity: 10, unit: 'ml', calories: 89.9, protein: 0, carbs: 0, fat: 9.99 }
    ]
  },
  {
    name: 'Escalivada con Anchoas',
    description: 'Verduras asadas con el toque salino de las anchoas, una cena mediterránea.',
    instructions: '1. Asar en el horno pimientos rojos y berenjenas hasta que la piel esté negra. 2. Dejar enfriar, pelar y cortar en tiras. 3. Aliñar con aceite de oliva y sal. 4. Servir con unas anchoas por encima.',
    calories: 350,
    protein: 10,
    carbs: 15,
    fat: 28,
    ingredients: [
      { id: 'ing-pimiento-rojo', name: 'Pimiento rojo', quantity: 200, unit: 'g', calories: 74, protein: 2, carbs: 12.8, fat: 0.8 },
      { id: 'ing-berenjena', name: 'Berenjena', quantity: 200, unit: 'g', calories: 54, protein: 2.4, carbs: 8.8, fat: 0.4 },
      { id: 'ing-anchoas', name: 'Anchoas en aceite', quantity: 30, unit: 'g', calories: 58.5, protein: 8.22, carbs: 0.12, fat: 2.79 },
      { id: 'ing-aceite-oliva', name: 'Aceite de oliva', quantity: 15, unit: 'ml', calories: 134.85, protein: 0, carbs: 0, fat: 14.98 }
    ]
  },
  {
    name: 'Sopa de Miso con Tofu y Algas',
    description: 'Una cena depurativa y ligera, inspirada en la cocina japonesa.',
    instructions: '1. Calentar caldo de verduras o dashi. 2. Disolver una cucharada de pasta de miso en un poco de caldo caliente y añadirlo a la olla. 3. Incorporar el tofu en cubos y las algas wakame (previamente hidratadas). 4. Cocer un par de minutos sin que llegue a hervir fuerte. Servir.',
    calories: 200,
    protein: 15,
    carbs: 10,
    fat: 10,
    ingredients: [
      { id: 'ing-miso', name: 'Miso', quantity: 20, unit: 'g', calories: 43.6, protein: 2.34, carbs: 5.3, fat: 1.2 },
      { id: 'ing-tofu', name: 'Tofu', quantity: 100, unit: 'g', calories: 74, protein: 8.1, carbs: 0.7, fat: 4.2 },
      { id: 'ing-algas-wakame', name: 'Algas wakame frescas', quantity: 50, unit: 'g', calories: 27, protein: 1.5, carbs: 4.35, fat: 0.32 },
    ]
  },
  {
    name: 'Carpaccio de Calabacín con Parmesano',
    description: 'Una cena crudivegana, fresca y sorprendentemente sabrosa.',
    instructions: '1. Con un pelador o mandolina, cortar el calabacín en láminas muy finas. 2. Disponer las láminas en un plato. 3. Aliñar con zumo de limón, aceite de oliva, sal y pimienta. 4. Añadir lascas de parmesano y unas nueces picadas por encima.',
    calories: 380,
    protein: 15,
    carbs: 10,
    fat: 32,
    ingredients: [
      { id: 'ing-calabacin', name: 'Calabacín', quantity: 200, unit: 'g', calories: 28, protein: 1.2, carbs: 4.4, fat: 0.4 },
      { id: 'ing-parmesano', name: 'Queso parmesano', quantity: 30, unit: 'g', calories: 126, protein: 12, carbs: 0, fat: 8.67 },
      { id: 'ing-nueces', name: 'Nueces sin cascara', quantity: 20, unit: 'g', calories: 122.2, protein: 2.8, carbs: 0.66, fat: 11.8 },
      { id: 'ing-aceite-oliva', name: 'Aceite de oliva', quantity: 10, unit: 'ml', calories: 89.9, protein: 0, carbs: 0, fat: 9.99 }
    ]
  },
  {
    name: 'Brócoli al Vapor con Patata y Pimentón',
    description: 'Una cena sencilla, saludable y muy completa.',
    instructions: '1. Cocer el brócoli y las patatas (peladas y en trozos) al vapor hasta que estén tiernas (unos 15-20 min). 2. Colocar en un plato. 3. Aliñar con un buen chorro de aceite de oliva virgen extra, sal y pimentón dulce o picante.',
    calories: 450,
    protein: 12,
    carbs: 55,
    fat: 20,
    ingredients: [
      { id: 'ing-brocoli', name: 'Brecol', quantity: 300, unit: 'g', calories: 114, protein: 13.2, carbs: 5.4, fat: 2.7 },
      { id: 'ing-patata', name: 'Patata (b)', quantity: 200, unit: 'g', calories: 176, protein: 5, carbs: 36, fat: 0.4 },
      { id: 'ing-aceite-oliva', name: 'Aceite de oliva', quantity: 15, unit: 'ml', calories: 134.85, protein: 0, carbs: 0, fat: 14.98 },
      { id: 'ing-pimenton', name: 'Pimentón', quantity: 2, unit: 'g', calories: 6.32, protein: 0.3, carbs: 0.7, fat: 0.26 }
    ]
  },
  {
    name: 'Tortilla Francesa con Espinacas y Queso de Cabra',
    description: 'Un clásico rápido para cenar, pero con un toque gourmet.',
    instructions: '1. Saltear las espinacas en una sartén. 2. Batir los huevos y añadirlos a la sartén. 3. Cuando empiece a cuajar, añadir el queso de cabra desmenuzado. 4. Doblar la tortilla y cocinar al gusto.',
    calories: 420,
    protein: 25,
    carbs: 5,
    fat: 32,
    ingredients: [
      { id: 'ing-huevo', name: 'Huevo de gallina', quantity: 120, unit: 'g', calories: 180, protein: 15, carbs: 0, fat: 13.32 },
      { id: 'ing-espinacas', name: 'Espinacas', quantity: 100, unit: 'g', calories: 31, protein: 2.6, carbs: 1.2, fat: 0.3 },
      { id: 'ing-queso-cabra', name: 'Queso de cabra tierno', quantity: 50, unit: 'g', calories: 99.5, protein: 6.55, carbs: 0.5, fat: 7.9 }
    ]
  },
  {
    name: 'Sepia a la Plancha con Ajo y Perejil',
    description: 'Una cena marinera, muy sabrosa, ligera y alta en proteínas.',
    instructions: '1. Limpiar bien la sepia y secarla. 2. Calentar una plancha o sartén a fuego fuerte con un poco de aceite. 3. Cocinar la sepia 2-3 minutos por cada lado. 4. Mientras, picar ajo y perejil muy finos y mezclar con aceite. 5. Servir la sepia recién hecha con el aliño por encima.',
    calories: 350,
    protein: 40,
    carbs: 2,
    fat: 20,
    ingredients: [
      { id: 'ing-sepia', name: 'Sepia', quantity: 250, unit: 'g', calories: 177.5, protein: 40.25, carbs: 0, fat: 1.75 },
      { id: 'ing-aceite-oliva', name: 'Aceite de oliva', quantity: 15, unit: 'ml', calories: 134.85, protein: 0, carbs: 0, fat: 14.98 },
      { id: 'ing-ajo', name: 'Ajo', quantity: 10, unit: 'g', calories: 11.8, protein: 0.53, carbs: 2.3, fat: 0.03 },
      { id: 'ing-perejil', name: 'Perejil fresco', quantity: 10, unit: 'g', calories: 4.5, protein: 0.3, carbs: 0.27, fat: 0.13 }
    ]
  },
  {
    name: 'Ensalada de Lentejas con Ventresca',
    description: 'Una ensalada templada que sirve como plato único, muy completa.',
    instructions: '1. Escurrir bien las lentejas de bote. 2. Picar finamente cebolleta y pimiento. 3. Mezclar las lentejas con las verduras picadas. 4. Aliñar con vinagre y aceite. 5. Servir con unos lomos de ventresca de atún por encima.',
    calories: 500,
    protein: 30,
    carbs: 40,
    fat: 25,
    ingredients: [
      { id: 'ing-lentejas-conserva', name: 'Lenteja en conserva', quantity: 200, unit: 'g', calories: 166, protein: 12.6, carbs: 22.8, fat: 0.4 },
      { id: 'ing-atun-aceite', name: 'Atun en aceite', quantity: 80, unit: 'g', calories: 253.6, protein: 19.2, carbs: 0, fat: 19.6 },
      { id: 'ing-cebolleta', name: 'Cebolleta', quantity: 50, unit: 'g', calories: 14.5, protein: 0.7, carbs: 2.55, fat: 0 },
      { id: 'ing-pimiento-verde', name: 'Pimiento verde', quantity: 50, unit: 'g', calories: 11.5, protein: 0.45, carbs: 1.85, fat: 0.1 }
    ]
  }
];
