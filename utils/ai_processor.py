"""
AI Processor module for the IdeaFlow application.
Handles NLP tasks like clustering ideas into themes.
"""

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import DBSCAN, KMeans
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity
import spacy
import uuid
import re
from collections import Counter

# Load spaCy model for English
try:
    nlp = spacy.load("en_core_web_sm")
except:
    # Fallback to smaller model if the large one is not available
    try:
        nlp = spacy.load("en_core_web_md")
    except:
        # If no spaCy model is available, use basic NLP
        print("spaCy models not available, using basic NLP")
        nlp = None

class AIProcessor:
    """
    Processes ideas using NLP techniques to group them into themes
    and provide insights.
    """
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            max_features=5000,
            min_df=1,
            max_df=0.8,
            stop_words='english'
        )
    
    def preprocess_text(self, text):
        """Preprocess text for analysis"""
        if not text or not isinstance(text, str):
            return ""
            
        # Convert to lowercase and remove special characters
        text = re.sub(r'[^\w\s]', ' ', text.lower())
        
        if nlp:
            # Use spaCy for lemmatization if available
            doc = nlp(text)
            tokens = [token.lemma_ for token in doc if not token.is_stop and not token.is_punct and len(token.text) > 1]
            return " ".join(tokens)
        else:
            # Basic preprocessing if spaCy is not available
            return text
    
    def get_themes_from_ideas(self, ideas, min_ideas_per_theme=2, max_themes=8):
        """
        Group ideas into themes using clustering
        
        Args:
            ideas: List of idea dictionaries with 'id' and 'content' keys
            min_ideas_per_theme: Minimum ideas required to form a theme
            max_themes: Maximum number of themes to generate
            
        Returns:
            Dictionary with themes and their assigned ideas
        """
        if not ideas or len(ideas) < min_ideas_per_theme:
            return {
                'themes': [],
                'idea_theme_mapping': {}
            }
        
        # Extract text content from ideas
        idea_texts = [idea['content'] for idea in ideas]
        idea_ids = [idea['id'] for idea in ideas]
        
        # Preprocess texts
        preprocessed_texts = [self.preprocess_text(text) for text in idea_texts]
        
        if len(preprocessed_texts) < min_ideas_per_theme:
            return {
                'themes': [],
                'idea_theme_mapping': {}
            }
        
        # Create TF-IDF matrix
        try:
            tfidf_matrix = self.vectorizer.fit_transform(preprocessed_texts)
        except:
            # Fallback if vectorization fails
            return {
                'themes': [],
                'idea_theme_mapping': {}
            }
        
        # Determine optimal number of clusters (themes)
        n_ideas = len(ideas)
        n_clusters = min(max(2, n_ideas // 3), max_themes)
        
        # Apply dimension reduction for better clustering
        if tfidf_matrix.shape[1] > 100:
            svd = TruncatedSVD(n_components=min(100, tfidf_matrix.shape[0] - 1))
            tfidf_matrix = svd.fit_transform(tfidf_matrix)
        
        # Cluster ideas using K-means
        try:
            kmeans = KMeans(n_clusters=n_clusters, random_state=42)
            clusters = kmeans.fit_predict(tfidf_matrix)
        except:
            # Fallback to DBSCAN if K-means fails
            try:
                dbscan = DBSCAN(eps=0.5, min_samples=min_ideas_per_theme)
                clusters = dbscan.fit_predict(tfidf_matrix)
            except:
                return {
                    'themes': [],
                    'idea_theme_mapping': {}
                }
        
        # Create mapping of ideas to clusters
        idea_clusters = {}
        cluster_ideas = {}
        
        for i, (idea_id, cluster) in enumerate(zip(idea_ids, clusters)):
            # Skip unclustered ideas (cluster = -1)
            if cluster >= 0:
                # Convert numpy types to Python types for database compatibility
                cluster_id = int(cluster) if hasattr(cluster, 'item') else cluster
                idea_clusters[idea_id] = cluster_id
                if cluster_id not in cluster_ideas:
                    cluster_ideas[cluster_id] = []
                cluster_ideas[cluster_id].append({
                    'id': idea_id,
                    'content': idea_texts[i]
                })
        
        # Generate theme names and descriptions
        themes = []
        
        for cluster, cluster_content in cluster_ideas.items():
            if len(cluster_content) < min_ideas_per_theme:
                # Skip clusters with too few ideas
                continue
                
            # Extract texts for this cluster
            cluster_texts = [item['content'] for item in cluster_content]
            
            # Generate theme name
            theme_name = self.generate_theme_name(cluster_texts)
            
            # Create theme object
            theme_id = str(uuid.uuid4())
            themes.append({
                'id': theme_id,
                'name': theme_name,
                'description': self.generate_theme_description(cluster_texts),
                'idea_count': len(cluster_content)
            })
            
            # Update idea_clusters with theme_id
            for item in cluster_content:
                idea_clusters[item['id']] = theme_id
        
        return {
            'themes': themes,
            'idea_theme_mapping': idea_clusters
        }
    
    def generate_theme_name(self, texts, max_length=40):
        """Generate a theme name from a list of related texts"""
        # Combine all texts and find most common significant words
        combined_text = " ".join(texts)
        
        if nlp:
            # Use spaCy for concept extraction, focusing on business categories
            doc = nlp(combined_text)
            
            # Define business concept mapping
            business_concepts = {
                'customer': ['Customer Experience', 'Customer Relations', 'Customer Service'],
                'loyalty': ['Customer Experience', 'Customer Relations', 'Retention'],
                'menu': ['Menu & Food', 'Culinary Experience', 'Food Service'],
                'seasonal': ['Menu & Food', 'Seasonal Offerings', 'Food Innovation'],
                'mobile': ['Technology', 'Digital Solutions', 'Mobile Apps'],
                'app': ['Technology', 'Digital Solutions', 'Mobile Apps'],
                'technology': ['Technology', 'Digital Solutions', 'Innovation'],
                'digital': ['Technology', 'Digital Solutions', 'Innovation'],
                'staff': ['Staff & Operations', 'Human Resources', 'Team Management'],
                'employee': ['Staff & Operations', 'Human Resources', 'Team Management'],
                'recognition': ['Staff & Operations', 'Human Resources', 'Team Management'],
                'interior': ['Ambiance & Design', 'Physical Space', 'Interior Design'],
                'design': ['Ambiance & Design', 'Physical Space', 'Design'],
                'ambiance': ['Ambiance & Design', 'Physical Space', 'Experience'],
                'marketing': ['Marketing & Promotion', 'Brand Building', 'Customer Outreach'],
                'social': ['Marketing & Promotion', 'Social Media', 'Brand Building'],
                'email': ['Marketing & Promotion', 'Communication', 'Customer Outreach'],
                'photography': ['Marketing & Promotion', 'Visual Content', 'Brand Building'],
                'event': ['Events & Entertainment', 'Customer Experience', 'Special Occasions'],
                'dinner': ['Events & Entertainment', 'Dining Experience', 'Food Service'],
                'themed': ['Events & Entertainment', 'Special Occasions', 'Experience'],
                'program': ['Programs & Systems', 'Business Operations', 'Customer Experience']
            }
            
            # Extract meaningful tokens
            meaningful_tokens = []
            for token in doc:
                if (not token.is_stop and not token.is_punct and 
                    token.pos_ in ['NOUN', 'ADJ', 'VERB'] and
                    len(token.text) > 3):
                    meaningful_tokens.append(token.lemma_.lower())
            
            # Map tokens to business concepts
            concept_scores = {}
            for token in meaningful_tokens:
                if token in business_concepts:
                    for concept in business_concepts[token]:
                        concept_scores[concept] = concept_scores.get(concept, 0) + 1
            
            # If we found business concepts, use the most common one
            if concept_scores:
                best_concept = max(concept_scores.items(), key=lambda x: x[1])
                return best_concept[0][:max_length]
            
            # Fallback: Extract most common meaningful nouns
            if meaningful_tokens:
                counter = Counter(meaningful_tokens)
                common_words = counter.most_common(3)
                
                # Create theme name from top keywords, avoiding specific examples
                theme_words = []
                for word, count in common_words:
                    # Skip specific examples and days/months
                    if (word not in ['wine', 'pairing', 'wednesday', 'murder', 'mystery'] and
                        not any(day in word for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) and
                        len(theme_words) < 2):
                        theme_words.append(word.capitalize())
                
                if theme_words:
                    if len(theme_words) == 1:
                        return f"{theme_words[0]} Solutions"
                    else:
                        return " & ".join(theme_words)
        
        # Ultimate fallback - create descriptive theme based on text analysis
        words = combined_text.lower().split()
        if 'customer' in words or 'loyalty' in words:
            return "Customer Experience"
        elif 'menu' in words or 'food' in words or 'seasonal' in words:
            return "Menu & Food Innovation"
        elif 'app' in words or 'mobile' in words or 'technology' in words:
            return "Technology Solutions"
        elif 'staff' in words or 'employee' in words:
            return "Staff & Operations"
        elif 'marketing' in words or 'social' in words:
            return "Marketing & Promotion"
        elif 'event' in words or 'dinner' in words:
            return "Events & Entertainment"
        else:
            return "Business Innovation"
    
    def generate_theme_description(self, texts, max_length=120):
        """Generate a description for a theme based on related texts"""
        # Simple approach: combine first parts of each text
        summaries = []
        
        for text in texts[:3]:  # Use up to 3 texts
            # Take first 30 characters of each text
            summary = text[:40].strip()
            if summary and summary not in summaries:
                summaries.append(summary)
        
        if summaries:
            description = " | ".join(summaries)
            return description[:max_length] + ("..." if len(description) > max_length else "")
        else:
            return "A collection of related ideas"
