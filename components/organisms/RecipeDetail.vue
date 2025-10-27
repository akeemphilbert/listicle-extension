<template>
  <div class="recipe-detail">
    <div class="recipe-detail__header">
      <button class="recipe-detail__back-btn" @click="$emit('close')">
        <BaseIcon name="arrow-left" size="small" />
      </button>
      <h1 class="recipe-detail__title">{{ recipeName }}</h1>
    </div>

    <div class="recipe-detail__content">
      <!-- Recipe Image -->
      <div v-if="recipeImage" class="recipe-detail__image">
        <img :src="recipeImage" :alt="recipeName" />
      </div>

      <!-- Recipe Info -->
      <div class="recipe-detail__info">
        <div v-if="recipeDescription" class="recipe-detail__description">
          {{ recipeDescription }}
        </div>

        <!-- Serving Size Control -->
        <div class="recipe-detail__servings">
          <label class="recipe-detail__label">Serving Size:</label>
          <div class="recipe-detail__servings-control">
            <button 
              class="recipe-detail__servings-btn" 
              @click="decreaseServing"
              :disabled="servingSize <= 1"
            >
              −
            </button>
            <input 
              type="number" 
              v-model.number="servingSize" 
              min="1"
              class="recipe-detail__servings-input"
              @input="onServingSizeChange"
            />
            <button 
              class="recipe-detail__servings-btn" 
              @click="increaseServing"
            >
              +
            </button>
          </div>
        </div>

        <!-- Ingredients Section -->
        <div class="recipe-detail__ingredients">
          <h2 class="recipe-detail__section-title">Ingredients</h2>
          <ul class="recipe-detail__ingredients-list">
            <li 
              v-for="(ingredient, index) in scaledIngredients" 
              :key="index"
              class="recipe-detail__ingredient"
            >
              {{ ingredient }}
            </li>
          </ul>
        </div>

        <!-- Instructions Section -->
        <div v-if="instructions.length > 0" class="recipe-detail__instructions">
          <h2 class="recipe-detail__section-title">Instructions</h2>
          <ol class="recipe-detail__instructions-list">
            <li 
              v-for="(instruction, index) in instructions" 
              :key="index"
              class="recipe-detail__instruction"
            >
              {{ instruction }}
            </li>
          </ol>
        </div>

        <!-- Additional Info -->
        <div v-if="hasAdditionalInfo" class="recipe-detail__additional">
          <div v-if="prepTime" class="recipe-detail__info-item">
            <strong>Prep Time:</strong> {{ prepTime }}
          </div>
          <div v-if="cookTime" class="recipe-detail__info-item">
            <strong>Cook Time:</strong> {{ cookTime }}
          </div>
          <div v-if="totalTime" class="recipe-detail__info-item">
            <strong>Total Time:</strong> {{ totalTime }}
          </div>
          <div v-if="cuisine" class="recipe-detail__info-item">
            <strong>Cuisine:</strong> {{ cuisine }}
          </div>
          <div v-if="category" class="recipe-detail__info-item">
            <strong>Category:</strong> {{ category }}
          </div>
          <div v-if="difficulty" class="recipe-detail__info-item">
            <strong>Difficulty:</strong> {{ difficulty }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import BaseIcon from '@/components/atoms/BaseIcon.vue';

interface RecipeData {
  name?: string;
  description?: string;
  ingredients?: string[];
  instructions?: string[];
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  yield?: string;
  nutrition?: {
    calories?: string;
    fat?: string;
    protein?: string;
    carbs?: string;
  };
  author?: string;
  published?: string;
  image?: string;
  url?: string;
  cuisine?: string;
  category?: string;
  difficulty?: string;
  rating?: string;
}

const props = defineProps<{
  task: {
    id: string;
    title: string;
    jsonLd?: any;
    description?: string;
    url?: string;
  };
}>();

defineEmits<{
  close: [];
}>();

const servingSize = ref(4); // Default serving size
const originalIngredients = ref<string[]>([]);
const instructions = ref<string[]>([]);
const recipeDescription = ref<string>('');
const recipeImage = ref<string | undefined>('');

// Recipe metadata
const prepTime = ref<string>('');
const cookTime = ref<string>('');
const totalTime = ref<string>('');
const cuisine = ref<string>('');
const category = ref<string>('');
const difficulty = ref<string>('');

const recipeName = computed(() => props.task.title);

const hasAdditionalInfo = computed(() => {
  return !!(prepTime.value || cookTime.value || totalTime.value || 
            cuisine.value || category.value || difficulty.value);
});

// Extract recipe data from jsonLd or try to parse from various sources
const extractRecipeData = () => {
  const jsonLd = props.task.jsonLd || {};
  
  // Try to extract from Schema.org Recipe format
  let recipe: RecipeData = {};
  
  if (jsonLd['@type'] === 'Recipe') {
    recipe = {
      name: jsonLd.name || props.task.title,
      description: jsonLd.description || props.task.description,
      ingredients: jsonLd.recipeIngredient || jsonLd.ingredients,
      instructions: jsonLd.recipeInstructions || 
                    (jsonLd.instructions ? 
                      (Array.isArray(jsonLd.instructions) ? 
                        jsonLd.instructions.map((i: any) => i.text || i) : 
                        [jsonLd.instructions]) : 
                      undefined),
      prepTime: jsonLd.prepTime,
      cookTime: jsonLd.cookTime,
      totalTime: jsonLd.totalTime,
      image: typeof jsonLd.image === 'string' ? jsonLd.image : 
             (Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image?.url),
      cuisine: jsonLd.recipeCuisine,
      category: jsonLd.recipeCategory,
      difficulty: jsonLd.difficulty,
      yield: jsonLd.recipeYield
    };
  }
  
  // Extract image from various formats
  if (jsonLd.image) {
    if (typeof jsonLd.image === 'string') {
      recipeImage.value = jsonLd.image;
    } else if (Array.isArray(jsonLd.image) && jsonLd.image[0]) {
      recipeImage.value = typeof jsonLd.image[0] === 'string' ? jsonLd.image[0] : jsonLd.image[0].url;
    } else if (jsonLd.image.url) {
      recipeImage.value = jsonLd.image.url;
    }
  }
  
  // Initialize data
  recipeDescription.value = recipe.description || props.task.description || '';
  originalIngredients.value = recipe.ingredients || [];
  instructions.value = recipe.instructions || [];
  prepTime.value = recipe.prepTime || '';
  cookTime.value = recipe.cookTime || '';
  totalTime.value = recipe.totalTime || '';
  cuisine.value = recipe.cuisine || '';
  category.value = recipe.category || '';
  difficulty.value = recipe.difficulty || '';
  
  // Try to extract default serving size from yield
  if (recipe.yield) {
    const match = recipe.yield.match(/(\d+)/);
    if (match) {
      servingSize.value = parseInt(match[1], 10);
    }
  }
};

// Scale ingredients based on serving size
const scaledIngredients = computed(() => {
  if (originalIngredients.value.length === 0) {
    return [];
  }
  
  return originalIngredients.value.map(ingredient => {
    // Try to extract a number from the ingredient
    const match = ingredient.match(/^([\d.\/]+)\s*(.+)$/);
    if (!match) {
      return ingredient; // No quantity to scale
    }
    
    const quantityStr = match[1];
    const rest = match[2];
    
    // Parse the quantity (handle fractions)
    let quantity = 0;
    if (quantityStr.includes('/')) {
      const [numerator, denominator] = quantityStr.split('/').map(Number);
      quantity = numerator / denominator;
    } else {
      quantity = parseFloat(quantityStr);
    }
    
    if (isNaN(quantity)) {
      return ingredient;
    }
    
    // Scale the quantity
    const scaledQuantity = (quantity * servingSize.value) / 4; // Assume original is for 4 servings
    
    // Format the scaled quantity nicely
    let formattedQuantity: string;
    if (scaledQuantity % 1 === 0) {
      formattedQuantity = scaledQuantity.toString();
    } else {
      // Convert to fraction if it's close to a common fraction
      const fractions = [
        { val: 1/8, str: '⅛' },
        { val: 1/4, str: '¼' },
        { val: 1/3, str: '⅓' },
        { val: 3/8, str: '⅜' },
        { val: 1/2, str: '½' },
        { val: 5/8, str: '⅝' },
        { val: 2/3, str: '⅔' },
        { val: 3/4, str: '¾' },
        { val: 7/8, str: '⅞' }
      ];
      
      let bestMatch = null;
      for (const frac of fractions) {
        if (Math.abs(scaledQuantity % 1 - frac.val) < 0.1) {
          const whole = Math.floor(scaledQuantity);
          if (whole > 0) {
            formattedQuantity = `${whole} ${frac.str}`;
          } else {
            formattedQuantity = frac.str;
          }
          bestMatch = frac;
          break;
        }
      }
      
      if (!bestMatch) {
        formattedQuantity = scaledQuantity.toFixed(1).replace(/\.0$/, '');
      }
    }
    
    return `${formattedQuantity} ${rest}`;
  });
});

const increaseServing = () => {
  servingSize.value++;
};

const decreaseServing = () => {
  if (servingSize.value > 1) {
    servingSize.value--;
  }
};

const onServingSizeChange = () => {
  if (servingSize.value < 1) {
    servingSize.value = 1;
  }
};

onMounted(() => {
  extractRecipeData();
});
</script>

<style scoped>
.recipe-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
}

.recipe-detail__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f3f3f3;
  flex-shrink: 0;
}

.recipe-detail__back-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: background-color 0.15s ease;
}

.recipe-detail__back-btn:hover {
  background-color: #f5f5f5;
}

.recipe-detail__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #202020;
  margin: 0;
  flex: 1;
}

.recipe-detail__content {
  flex: 1;
  overflow-y: auto;
}

.recipe-detail__image {
  width: 100%;
  max-height: 200px;
  overflow: hidden;
  background: #f9f9f9;
}

.recipe-detail__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.recipe-detail__info {
  padding: 1rem;
}

.recipe-detail__description {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.recipe-detail__servings {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
}

.recipe-detail__label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #202020;
  margin-bottom: 0.5rem;
}

.recipe-detail__servings-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.recipe-detail__servings-btn {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.25rem;
  color: #202020;
  transition: all 0.15s ease;
}

.recipe-detail__servings-btn:hover:not(:disabled) {
  background-color: #f5f5f5;
  border-color: #db4c3f;
}

.recipe-detail__servings-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.recipe-detail__servings-input {
  flex: 1;
  text-align: center;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
}

.recipe-detail__servings-input:focus {
  outline: none;
  border-color: #db4c3f;
}

.recipe-detail__section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #202020;
  margin: 0 0 0.75rem 0;
}

.recipe-detail__ingredients {
  margin-bottom: 1.5rem;
}

.recipe-detail__ingredients-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recipe-detail__ingredient {
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f3f3;
  font-size: 0.875rem;
  color: #202020;
  line-height: 1.5;
}

.recipe-detail__ingredient:last-child {
  border-bottom: none;
}

.recipe-detail__instructions {
  margin-bottom: 1.5rem;
}

.recipe-detail__instructions-list {
  padding-left: 1.5rem;
  margin: 0;
}

.recipe-detail__instruction {
  padding: 0.5rem 0;
  font-size: 0.875rem;
  color: #202020;
  line-height: 1.5;
}

.recipe-detail__additional {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 8px;
}

.recipe-detail__info-item {
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.recipe-detail__info-item:last-child {
  margin-bottom: 0;
}

.recipe-detail__info-item strong {
  color: #202020;
  margin-right: 0.5rem;
}
</style>
