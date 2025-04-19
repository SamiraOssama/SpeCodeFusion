import os
import logging
import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (
    Dense, LSTM, Bidirectional, Embedding, SpatialDropout1D, BatchNormalization, Dropout
)
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import matplotlib.pyplot as plt
import joblib

# Setup logging
logging.basicConfig(
    filename="train_model_main.log",
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# Define paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
CSV_PATH = os.path.join(BASE_DIR, "data", "extracted_requirements.csv")
MODEL_PATH = os.path.join(OUTPUT_DIR, "requirement_extraction_model.keras")
TOKENIZER_PATH = os.path.join(OUTPUT_DIR, "tokenizer.pkl")

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

def train_model():
    logging.info("🚀 Starting model training process.")

    if not os.path.exists(CSV_PATH):
        logging.error(f"❌ CSV file not found at {CSV_PATH}.")
        raise FileNotFoundError(f"❌ CSV file not found at {CSV_PATH}.")

    df = pd.read_csv(CSV_PATH)
    
    if 'requirement' not in df.columns or 'label' not in df.columns:
        logging.error("❌ CSV file is missing required columns.")
        raise ValueError("❌ CSV file is missing 'requirement' or 'label' column.")
    
    df.dropna(subset=['requirement', 'label'], inplace=True)
    df['label'] = df['label'].map({'Functional': 1, 'Non-Functional': 0})
    df.dropna(subset=['label'], inplace=True)  # Ensure no NaNs after mapping
    df['label'] = df['label'].astype(int)

    X = df['requirement'].values
    y = df['label'].values
    
    max_features = 20000
    max_len = 100

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    tokenizer = Tokenizer(num_words=max_features)
    tokenizer.fit_on_texts(X_train)
    joblib.dump(tokenizer, TOKENIZER_PATH)

    X_train_pad = pad_sequences(tokenizer.texts_to_sequences(X_train), maxlen=max_len)
    X_test_pad = pad_sequences(tokenizer.texts_to_sequences(X_test), maxlen=max_len)

    model = Sequential([
        Embedding(input_dim=max_features, output_dim=128, input_length=max_len, embeddings_regularizer=tf.keras.regularizers.l2(0.01)),
        SpatialDropout1D(0.4),
        Bidirectional(LSTM(64, return_sequences=True, dropout=0.4, recurrent_dropout=0.4)),
        BatchNormalization(),
        Bidirectional(LSTM(32, dropout=0.4, recurrent_dropout=0.4)),
        BatchNormalization(),
        Dense(64, activation='relu', kernel_regularizer=tf.keras.regularizers.l2(0.01)),
        Dropout(0.4),
        Dense(32, activation='relu', kernel_regularizer=tf.keras.regularizers.l2(0.01)),
        Dropout(0.4),
        Dense(1, activation='sigmoid')
    ])

    model.compile(loss='binary_crossentropy', optimizer='adam', metrics=['accuracy'])

    early_stopping = tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)
    reduce_lr = tf.keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, min_lr=1e-5)
    
    history = model.fit(
        X_train_pad, y_train, 
        epochs=15, batch_size=32, validation_data=(X_test_pad, y_test), 
        callbacks=[early_stopping, reduce_lr]
    )
    
    y_pred_prob = model.predict(X_test_pad)
    y_pred = (y_pred_prob >= 0.5).astype(int)
    
    print("\n📊 Model Evaluation Metrics:")
    print(f"✅ Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(f"✅ Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"✅ Recall: {recall_score(y_test, y_pred):.4f}")
    print(f"✅ F1 Score: {f1_score(y_test, y_pred):.4f}")

    model.save(MODEL_PATH)
    print("🎯 Model saved successfully!")
    
    plt.figure(figsize=(12, 5))
    
    plt.subplot(1, 2, 1)
    plt.plot(history.history.get('accuracy', []), label='Train Accuracy', marker='o')
    plt.plot(history.history.get('val_accuracy', []), label='Validation Accuracy', marker='o')
    plt.title('Model Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.legend()
    plt.grid(True)
    
    plt.subplot(1, 2, 2)
    plt.plot(history.history.get('loss', []), label='Train Loss', marker='o')
    plt.plot(history.history.get('val_loss', []), label='Validation Loss', marker='o')
    plt.title('Model Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.show()

if __name__ == "__main__":
    try:
        train_model()
    except Exception as e:
        logging.exception("❌ An error occurred during model training.")
        print("❌ Model training failed. Check logs for details.")
