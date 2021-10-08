FROM debian:buster-slim

# add freeswitch repo
RUN apt-get update && \
apt-get install -y --no-install-recommends curl ca-certificates gnupg2 && \
curl -k https://files.freeswitch.org/repo/deb/debian-release/fsstretch-archive-keyring.asc | apt-key add - && \
echo 'deb http://files.freeswitch.org/repo/deb/debian-release/ buster main' > /etc/apt/sources.list.d/freeswitch.list

# install freeswitch
RUN apt-get update && apt-get install -y \
        freeswitch \
        freeswitch-mod-commands \
        freeswitch-mod-dialplan-xml \
        freeswitch-mod-dptools \
        freeswitch-mod-event-socket \
        freeswitch-mod-opus \
        freeswitch-mod-h26x \
        freeswitch-mod-rtc \
        freeswitch-mod-sofia \
        freeswitch-mod-spandsp \
        freeswitch-mod-sndfile

ENTRYPOINT /usr/bin/freeswitch