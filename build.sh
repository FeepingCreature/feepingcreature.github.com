ls *.md |while read FILE
do
	(
		cat template_pre
		markdown.pl < $FILE
		cat template_post
	) > ${FILE/%.md/.html}
done
