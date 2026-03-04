#!/bin/bash

# Seed script to populate campaign with dummy users
# Usage: ./scripts/seed-users.sh <campaign_id> [num_users]
# Example: ./scripts/seed-users.sh a868642a-690a-458a-9218-f4f54e6ad8cf 100

if [ -z "$1" ]; then
    echo "Usage: ./scripts/seed-users.sh <campaign_id> [num_users]"
    echo "Example: ./scripts/seed-users.sh a868642a-690a-458a-9218-f4f54e6ad8cf 100"
    exit 1
fi

CAMPAIGN_ID="$1"
API_URL="http://localhost:8080/api/v1/campaigns/${CAMPAIGN_ID}/users"

# Arrays of realistic UTM values
UTM_SOURCES=("google" "facebook" "twitter" "linkedin" "instagram" "tiktok" "youtube" "reddit" "pinterest" "whatsapp" "email" "newsletter" "bing" "duckduckgo" "referral" "organic" "direct" "producthunt" "hackernews" "betalist")
UTM_MEDIUMS=("cpc" "cpm" "social" "email" "organic" "referral" "display" "affiliate" "banner" "video" "native" "push" "sms" "podcast" "influencer")
UTM_CAMPAIGNS=("spring_launch" "summer_sale" "beta_invite" "early_access" "product_hunt_launch" "black_friday" "cyber_monday" "new_year_promo" "referral_program" "influencer_collab" "brand_awareness" "retargeting" "lead_gen" "signup_drive" "waitlist_push")
UTM_CONTENTS=("banner_ad" "sidebar_ad" "video_ad" "carousel" "story" "reel" "post" "tweet" "article" "newsletter_header" "footer_cta" "popup" "inline" "native_ad" "sponsored_post")
UTM_TERMS=("waitlist software" "launch management" "beta testing" "early access platform" "product launch" "startup tools" "saas launch" "pre-launch" "landing page builder" "referral marketing" "viral marketing" "growth hacking" "user acquisition" "lead generation" "email collection")

# Email domains
DOMAINS=("gmail.com" "yahoo.com" "hotmail.com" "outlook.com" "icloud.com" "protonmail.com" "fastmail.com" "hey.com" "pm.me" "tutanota.com" "zoho.com" "aol.com" "mail.com" "yandex.com" "gmx.com")

# First name parts for generating usernames
FIRST_NAMES=("john" "jane" "alex" "sam" "chris" "taylor" "jordan" "casey" "morgan" "riley" "quinn" "avery" "cameron" "drew" "jamie" "jesse" "kelly" "lee" "pat" "robin" "skyler" "terry" "blake" "charlie" "dakota" "emerson" "finley" "harper" "hayden" "hunter" "kendall" "logan" "mackenzie" "parker" "peyton" "reese" "river" "rowan" "sage" "sawyer" "spencer" "sydney" "toby" "tyler" "val" "winter" "zion" "addison" "adrian" "aiden" "aria" "aurora" "bella" "caleb" "chloe" "daniel" "david" "elena" "elijah" "emma" "ethan" "eva" "gabriel" "grace" "hannah" "henry" "isla" "jack" "james" "julia" "kai" "kate" "leo" "liam" "lily" "lucas" "luna" "mason" "mia" "noah" "olivia" "oscar" "penny" "ruby" "ryan" "sarah" "sofia" "theo" "william" "zoe")

# Referral codes (only use valid ones or empty)
REFERRAL_CODES=("5BH4AUXI" "" "" "" "" "" "" "" "" "")

# Random number between min and max
rand_range() {
    echo $(( $1 + RANDOM % ($2 - $1 + 1) ))
}

# Pick random element from array
pick_random() {
    local arr=("$@")
    echo "${arr[RANDOM % ${#arr[@]}]}"
}

# Generate random email
generate_email() {
    local first=$(pick_random "${FIRST_NAMES[@]}")
    local num=$(rand_range 1 9999)
    local domain=$(pick_random "${DOMAINS[@]}")
    echo "${first}${num}@${domain}"
}

# Generate random boolean for marketing consent (mostly true, sometimes false)
random_marketing_consent() {
    if (( RANDOM % 10 < 8 )); then
        echo "true"
    else
        echo "false"
    fi
}

# Number of users to create (from argument or random between 100-150)
if [ -n "$2" ]; then
    NUM_USERS="$2"
else
    NUM_USERS=$(rand_range 100 150)
fi
echo "Seeding campaign: $CAMPAIGN_ID"
echo "Creating $NUM_USERS users..."
echo "================================"

SUCCESS_COUNT=0
FAIL_COUNT=0

for i in $(seq 1 $NUM_USERS); do
    EMAIL=$(generate_email)
    UTM_SOURCE=$(pick_random "${UTM_SOURCES[@]}")
    UTM_MEDIUM=$(pick_random "${UTM_MEDIUMS[@]}")
    UTM_CAMPAIGN=$(pick_random "${UTM_CAMPAIGNS[@]}")
    UTM_CONTENT=$(pick_random "${UTM_CONTENTS[@]}")
    UTM_TERM=$(pick_random "${UTM_TERMS[@]}")
    REFERRAL=$(pick_random "${REFERRAL_CODES[@]}")
    MARKETING=$(random_marketing_consent)

    # Build JSON payload
    if [ -z "$REFERRAL" ]; then
        PAYLOAD=$(cat <<EOF
{"email":"${EMAIL}","terms_accepted":true,"marketing_consent":${MARKETING},"custom_fields":{},"utm_source":"${UTM_SOURCE}","utm_medium":"${UTM_MEDIUM}","utm_campaign":"${UTM_CAMPAIGN}","utm_content":"${UTM_CONTENT}","utm_term":"${UTM_TERM}"}
EOF
)
    else
        PAYLOAD=$(cat <<EOF
{"email":"${EMAIL}","terms_accepted":true,"marketing_consent":${MARKETING},"custom_fields":{},"referral_code":"${REFERRAL}","utm_source":"${UTM_SOURCE}","utm_medium":"${UTM_MEDIUM}","utm_campaign":"${UTM_CAMPAIGN}","utm_content":"${UTM_CONTENT}","utm_term":"${UTM_TERM}"}
EOF
)
    fi

    # Make the API call
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL" \
        -H 'Accept: */*' \
        -H 'Content-Type: application/json' \
        -H 'Origin: http://localhost:3000' \
        --data-raw "$PAYLOAD")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
        ((SUCCESS_COUNT++))
        echo "[$i/$NUM_USERS] ✓ Created: $EMAIL (source: $UTM_SOURCE)"
    else
        ((FAIL_COUNT++))
        echo "[$i/$NUM_USERS] ✗ Failed: $EMAIL (HTTP $HTTP_CODE)"
        echo "  Response: $BODY"
    fi

    # Small delay to avoid rate limiting
    sleep 0.1
done

echo ""
echo "================================"
echo "Complete!"
echo "Success: $SUCCESS_COUNT"
echo "Failed: $FAIL_COUNT"
echo "Total: $NUM_USERS"
