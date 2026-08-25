from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification, AutoConfig
model_id = "ChanchalSh/Muril_Government_FinedTuned_Model"
model_revision = "main"
subfolder = "muril_gov_sentiment_final"

config_obj = AutoConfig.from_pretrained(model_id, revision=model_revision, subfolder=subfolder)
print("Model type:", config_obj.model_type)
tokenizer = AutoTokenizer.from_pretrained(model_id, revision=model_revision, subfolder=subfolder)
model = AutoModelForSequenceClassification.from_pretrained(model_id, revision=model_revision, config=config_obj, subfolder=subfolder)
print("Success")
