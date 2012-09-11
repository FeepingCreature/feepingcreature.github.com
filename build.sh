ls *.md |while read FILE
do
	TITLE=$(head -n 1 "$FILE")
	(
		sed -e "s/%TITLE%/$TITLE/g" template_pre
		tail -n +2 "$FILE" |sundown
		cat template_post
	) > ${FILE/%.md/.html}
done
