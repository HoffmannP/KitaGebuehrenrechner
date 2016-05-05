UGLIFYJS      	= /usr/local/bin/uglifyjs
UGLIFYJSFLAGS 	= -m
UGLIFYCSS     	= /usr/local/bin/uglifycss
MINIFYHTML    	= /usr/local/bin/html-minifier
HTMLFLAGS		= -c .htmlMin.conf

HTML            = $(patsubst %.html,%.min.html,$(patsubst %.min.html,%.html,$(wildcard *.html)))
SCRIPT			= $(patsubst %.js,%.min.js,$(patsubst %.min.js,%.js,$(wildcard *.js)))
STYLE			= $(patsubst %.css,%.min.css,$(patsubst %.min.css,%.css,$(wildcard *.css)))

all: $(HTML)

upload: $(HTML) $(SCRIPT) $(STYLE)
	# Remember to set auth details in ~/.netrc
	echo "cd ichplatz/kitagebuehr" > ftp.action
	echo "$^" | sed -r "s/ /\nput /g;s/^/put /;s/put (index)\.min\.html/put \1.min.html \1.html/g" >> ftp.action
	echo "put favicon.ico" >> ftp.action
	echo "put humans.txt" >> ftp.action
	echo "put robots.txt" >> ftp.action
	ftp ichplatz.de < ftp.action
	rm ftp.action

%.min.js: %.js
	jshint $< && \
	jscs $< && \
	$(UGLIFYJS) $(UGLIFYJSFLAGS) -o $@ $<

%.min.css: %.css
	$(UGLIFYCSS) $< > $@

%.tmp.html: %.html $(SCRIPT) $(STYLE)
	sed -r "s/('|\")([a-zA-Z0-9]*)\.(css|js)\1/\1\2.min.\3\1/" $< > $@

%.min.html: %.tmp.html
	$(MINIFYHTML) $(HTMLFLAGS) -o $@ $<

.PHONY: clean
clean:
	rm -f *.min.*

