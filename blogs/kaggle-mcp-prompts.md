Use Kaggle tools to search datasets for chest xray pneumonia (page_size 5). Show title, owner, download_count, last_updated, and the dataset slug.
Get dataset info for uciml/pima-indians-diabetes-database and summarize: total_bytes, license, usability_rating, current_version_number, files count.
“List dataset files for zynicide/wine-reviews (page_size 10). Return just file names + totalBytes.”
“Search competitions for titanic and list the top 5 with deadline and evaluation_metric.”
“Get competition metadata for titanic and show: max_daily_submissions, max_team_size, is_kernels_submissions_only, reward, deadline.”
“Get the competition leaderboard for titanic (page_size 10). Show rank, team name, score.”
“Search notebooks for xgboost titanic (page_size 5). For each: kernel slug, author, last run time (if available).”
“Get notebook info for {user}/{kernel-slug} (pick one from the previous result) and show its language, title, and first 30 lines of the source.”
“List models matching gemma (page_size 5, sort_by DOWNLOAD_COUNT). Show owner, title, vote_count, update_time.”
“For model {owner_slug}/{model_slug} (pick one), list variations and then list variation versions for the first variation; summarize available frameworks + latest version_number.”
“Get benchmark leaderboard for {owner_slug}/{benchmark_slug} (use any benchmark you know) and show first 10 rows.”